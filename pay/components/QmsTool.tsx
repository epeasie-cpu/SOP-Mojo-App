"use client";

import { useState } from "react";
import { requestQmsPlan } from "@/app/free/qms-check/actions";
import { QMS_BUILDER_PRO_GO, qmsErrorMessage } from "@/lib/qms-page";
import { QMS_QUESTIONS, parseQmsAnswers, qmsGapHeading, scoreQms } from "@/lib/qms-score";

const buttonClass =
  "inline-flex min-h-14 items-center justify-center rounded-sm bg-[#C1FF72] px-4 text-center text-base font-semibold text-[#0C0E0C] disabled:opacity-50";

export function QmsTool({ initialError }: { initialError: string | null }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);
  const parsed = parseQmsAnswers(answers);
  const result = parsed ? scoreQms(parsed) : null;
  const question = QMS_QUESTIONS[step];

  if (question && !(step >= QMS_QUESTIONS.length && result)) {
    const selected = answers[question.id];
    return (
      <section className="mt-6 max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6" aria-labelledby="qms-question">
        <p className="text-sm text-zinc-400">
          Question {step + 1} of {QMS_QUESTIONS.length}
        </p>
        <h2 id="qms-question" className="mt-2 text-2xl font-semibold text-zinc-50">
          {question?.prompt}
        </h2>
        <fieldset className="mt-4 grid gap-3">
          <legend className="sr-only">{question?.prompt}</legend>
          {question?.options.map((option) => (
            <label key={option.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base">
              <input
                type="radio"
                name={question.id}
                value={option.id}
                checked={selected === option.id}
                onChange={() => {
                  setAnswers((current) => ({ ...current, [question.id]: option.id }));
                  setError(null);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
        <div className="mt-4 flex gap-3">
          {step > 0 ? (
            <button type="button" className="min-h-14 rounded-sm px-4 text-zinc-200" onClick={() => setStep((current) => current - 1)}>
              Back
            </button>
          ) : null}
          <button
            type="button"
            className={buttonClass}
            disabled={!selected}
            onClick={() => setStep((current) => current + 1)}
          >
            {step === QMS_QUESTIONS.length - 1 ? "See my result" : "Next"}
          </button>
        </div>
      </section>
    );
  }

  if (!result) return null;
  const gapHeading = qmsGapHeading(result.gaps.length);

  return (
    <section className="mt-6 max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6" aria-live="polite">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#C1FF72] uppercase">Your result</p>
      <h2 className="mt-2 text-3xl font-semibold text-zinc-50">
        {result.category}. {result.categoryTitle}
      </h2>
      <p className="mt-3 text-base leading-7 text-zinc-200">{result.summary}</p>
      <p className="mt-4 text-2xl font-semibold text-zinc-50">
        Process documentation score: {result.score}
        <span className="text-lg font-normal text-zinc-400"> / 100</span>
      </p>
      {gapHeading ? <h3 className="mt-6 text-lg font-semibold text-zinc-50">{gapHeading}</h3> : null}
      {result.gaps.length > 0 ? (
        <ul className="mt-2 list-disc space-y-2 pl-5 text-zinc-200">
          {result.gaps.map((gap) => (
            <li key={gap.id}>
              <span className="font-semibold text-zinc-50">{gap.title}</span> ({gap.missed} points short). {gap.detail}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-zinc-200">None of the five documentation answers left points on the table.</p>
      )}
      {result.nextStep === "builder_pro" ? (
        <a href={QMS_BUILDER_PRO_GO} className={`${buttonClass} mt-6 w-full`}>
          Get Builder Pro — $39/mo
        </a>
      ) : null}
      <form
        className="mt-8 grid gap-4 border-t border-zinc-800 pt-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const data = new FormData(event.currentTarget);
          const sent = await requestQmsPlan(data);
          if (sent && !sent.ok) {
            setError(qmsErrorMessage(sent.code));
            setPending(false);
          }
        }}
      >
        {QMS_QUESTIONS.map((item) => (
          <input key={item.id} type="hidden" name={item.id} value={answers[item.id] ?? ""} />
        ))}
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="qms-company">Company</label>
          <input id="qms-company" name="company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-50">Email me the 30-day action plan</h3>
        <p className="text-sm text-zinc-400">The result above stays free. The plan is emailed once per address.</p>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="qms-name">
            Name
          </label>
          <input id="qms-name" name="name" type="text" required autoComplete="name" className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="qms-email">
            Email
          </label>
          <input id="qms-email" name="email" type="email" required autoComplete="email" className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base" />
        </div>
        {error ? (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? "Sending…" : "Email my action plan"}
        </button>
      </form>
    </section>
  );
}
