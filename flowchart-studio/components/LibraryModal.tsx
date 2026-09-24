"use client";

import { useEffect, useState } from "react";
import type { FlowGraph } from "@/lib/graph";
import {
  deleteRemoteMap,
  listLibraryMaps,
  loadLibraryMap,
  saveLibraryMap,
} from "@/lib/library-client";
import type { FlowchartMapSummary } from "@/lib/flowchart-maps";
import { clearSession, type ClientSession } from "@/lib/session";

export function LibraryModal({
  open,
  session,
  graph,
  libraryId,
  onClose,
  onLoad,
  onSaved,
  onSignOut,
}: {
  open: boolean;
  session: ClientSession | null;
  graph: FlowGraph;
  libraryId: string | null;
  onClose: () => void;
  onLoad: (graph: FlowGraph, id: string) => void;
  onSaved: (id: string | null) => void;
  onSignOut: () => void;
}) {
  if (!open || !session) return null;

  return (
    <LibraryModalBody
      session={session}
      graph={graph}
      libraryId={libraryId}
      onClose={onClose}
      onLoad={onLoad}
      onSaved={onSaved}
      onSignOut={onSignOut}
    />
  );
}

function LibraryModalBody({
  session,
  graph,
  libraryId,
  onClose,
  onLoad,
  onSaved,
  onSignOut,
}: {
  session: ClientSession;
  graph: FlowGraph;
  libraryId: string | null;
  onClose: () => void;
  onLoad: (graph: FlowGraph, id: string) => void;
  onSaved: (id: string | null) => void;
  onSignOut: () => void;
}) {
  const [maps, setMaps] = useState<FlowchartMapSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listLibraryMaps(session)
      .then((rows) => {
        if (!cancelled) setMaps(rows);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not list maps.");
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function save() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await saveLibraryMap(session, graph, libraryId);
      onSaved(saved.id);
      setMaps(await listLibraryMaps(session));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function openMap(id: string) {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const map = await loadLibraryMap(session, id);
      onLoad(map.graph, map.id);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open that map.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await deleteRemoteMap(session, id);
      if (id === libraryId) onSaved(null);
      setMaps(await listLibraryMaps(session));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete that map.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-lime uppercase">Library</p>
        <h2 id="library-title" className="font-display mt-2 text-2xl font-semibold text-zinc-50">
          Saved maps
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Signed in as {session.email || session.userId}. Builder Pro reads this same account.
        </p>
        {error ? <p className="mt-3 text-sm text-amber-200">{error}</p> : null}
        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {maps.length === 0 ? <p className="text-sm text-zinc-500">No saved maps yet.</p> : null}
          {maps.map((map) => (
            <div key={map.id} className="flex items-center gap-2 rounded-sm border border-zinc-800 px-3 py-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void openMap(map.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm text-zinc-100">{map.title}</span>
                <span className="block text-[11px] text-zinc-500">{map.nodeCount} nodes</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(map.id)}
                className="text-xs text-zinc-500 hover:text-amber-200"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-sm bg-lime px-3 py-2 text-sm font-semibold text-lime-ink disabled:opacity-40"
          >
            Save current map
          </button>
          <button
            type="button"
            className="rounded-sm border border-zinc-700 px-3 py-2 text-sm text-zinc-300"
            onClick={() => {
              clearSession();
              onSignOut();
            }}
          >
            Sign out
          </button>
          <button type="button" className="px-3 py-2 text-sm text-zinc-500" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
