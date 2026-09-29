import { useEffect, useRef } from "react";
import { QUIZ_LENGTH, type Choice, type Question } from "@/lib/questions";

export function Quiz({
  question,
  step,
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  question: Question;
  step: number;
  selected?: Choice;
  onSelect: (choice: Choice) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const progress = ((step + 1) / QUIZ_LENGTH) * 100;
  const last = step >= QUIZ_LENGTH - 1;

  useEffect(() => {
    headingRef.current?.focus();
  }, [question.id]);

  return (
    <div>
      <div
        className="h-1.5 bg-zinc-200"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={QUIZ_LENGTH}
        aria-valuenow={step + 1}
        aria-valuetext={`Question ${step + 1} of ${QUIZ_LENGTH}`}
      >
        <div className="h-full bg-mojo transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="mx-auto max-w-3xl px-4 pt-4 text-sm text-zinc-500">
        Question {step + 1} of {QUIZ_LENGTH}
      </p>
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-10">
          <h1
            id="q-prompt"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-zinc-950 outline-none sm:text-3xl"
          >
            {question.prompt}
          </h1>
          <p className="mt-3 text-sm text-zinc-500 sm:text-base">
            Pick the closest match. Be honest — this only helps your score.
          </p>
          <div role="radiogroup" aria-labelledby="q-prompt" className="mt-6 space-y-3">
            {question.options.map((option) => {
              const isSelected = selected === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelect(option.id)}
                  className={`flex min-h-14 w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] leading-snug transition ${
                    isSelected
                      ? "border-mojo bg-mojo-soft font-medium text-zinc-950"
                      : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      isSelected ? "border-mojo" : "border-zinc-300"
                    }`}
                    aria-hidden
                  >
                    {isSelected ? <span className="h-2.5 w-2.5 rounded-full bg-mojo" /> : null}
                  </span>
                  <span>
                    {option.id}. {option.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={onBack}
                className="min-h-11 rounded-lg px-3 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onNext}
              disabled={!selected}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {last ? "See my score →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
