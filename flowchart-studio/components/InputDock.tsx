"use client";

import { useRef, useState } from "react";
import { foldSpeechResults, speechResultsFromEvent } from "@/lib/voice";

type SpeechRecognitionResultLike = { isFinal?: boolean } & ArrayLike<{ transcript?: string }>;

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<SpeechRecognitionResultLike> }) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

async function fileToDataUrl(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read that photo.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that photo."));
      reader.readAsDataURL(file);
    });
  }
}

export function InputDock({
  busy,
  onGenerate,
  onPhoto,
}: {
  busy: boolean;
  onGenerate: (text: string, source: "text" | "voice") => void;
  onPhoto: (dataUrl: string) => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListenRef = useRef(false);
  const baselineRef = useRef("");
  const committedRef = useRef("");
  const snapRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  function talk() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setVoiceError("Voice needs Chrome, Edge, or Safari (Web Speech API).");
      return;
    }
    setVoiceError(null);
    if (listening && recRef.current) {
      wantListenRef.current = false;
      recRef.current.stop();
      setListening(false);
      return;
    }
    baselineRef.current = text;
    committedRef.current = text;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const folded = foldSpeechResults(baselineRef.current, speechResultsFromEvent(event.results));
      committedRef.current = folded.committed;
      setText(folded.display);
    };
    rec.onerror = (event) => {
      const fatal = event?.error === "not-allowed" || event?.error === "service-not-allowed";
      if (!fatal) return;
      wantListenRef.current = false;
      setVoiceError("Could not hear that. Try again or paste the process.");
      setListening(false);
    };
    rec.onend = () => {
      if (wantListenRef.current) {
        try {
          rec.start();
          return;
        } catch {
          wantListenRef.current = false;
        }
      }
      setListening(false);
    };
    recRef.current = rec;
    wantListenRef.current = true;
    rec.start();
    setListening(true);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    onPhoto(dataUrl);
  }

  return (
    <section className="border-b border-zinc-800 p-4">
      <h2 className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
        Capture
      </h2>
      <label className="sr-only" htmlFor="process-text">
        Process description
      </label>
      <textarea
        id="process-text"
        rows={5}
        value={text}
        disabled={busy}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste the process, or talk it through…"
        className="mt-3 w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-lime"
      />
      {voiceError ? <p className="mt-2 text-xs text-amber-300">{voiceError}</p> : null}
      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => onGenerate(text, listening ? "voice" : "text")}
        className="mt-3 w-full rounded-sm bg-lime px-2 py-2 text-xs font-semibold text-lime-ink disabled:opacity-40"
      >
        Map it
      </button>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={talk}
          className={`rounded-sm border px-2 py-2 text-xs font-semibold ${
            listening
              ? "border-lime bg-lime/10 text-lime"
              : "border-zinc-700 text-zinc-200 hover:border-lime"
          }`}
        >
          {listening ? "Listening…" : "Voice"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => snapRef.current?.click()}
          className="rounded-sm border border-zinc-700 px-2 py-2 text-xs font-semibold text-zinc-200 hover:border-lime"
        >
          Snap photo
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => uploadRef.current?.click()}
          className="rounded-sm border border-zinc-700 px-2 py-2 text-xs font-semibold text-zinc-200 hover:border-lime"
        >
          Upload photo
        </button>
      </div>
      <input
        ref={snapRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        Snap opens the camera. Upload picks a photo from files. Voice uses the browser Web Speech
        API and keeps one live transcript.
      </p>
    </section>
  );
}
