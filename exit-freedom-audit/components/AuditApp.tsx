"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isEmail, normalizeEmail } from "@/lib/email";
import {
  choiceForGoal,
  goalFromChoice,
  questionsFor,
  type Choice,
} from "@/lib/questions";
import { isQuizComplete, scoreQuiz, type Answers } from "@/lib/score";
import {
  EMPTY_SESSION,
  getServerSessionSnapshot,
  getServerUnlockSnapshot,
  getSessionSnapshot,
  getUnlockSnapshot,
  setSession,
  setStoredUnlock,
  subscribeSession,
  subscribeUnlock,
  type StoredUnlock,
} from "@/lib/storage";
import { Header } from "./Header";
import { Quiz } from "./Quiz";
import { Results } from "./Results";
import { SiteFooter } from "./SiteFooter";
import { StartQuizProvider } from "./StartQuizButton";

export function AuditApp({ children }: { children: React.ReactNode }) {
  const quiz = useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot);
  const unlock = useSyncExternalStore(subscribeUnlock, getUnlockSnapshot, getServerUnlockSnapshot);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [quiz.phase, quiz.step]);

  useEffect(() => {
    if (quiz.phase !== "results" || !quiz.goal || !unlock) return;
    if (unlock.goal === quiz.goal) return;
    const email = unlock.email;
    const goal = quiz.goal;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, goal }),
        });
        const data = (await response.json().catch(() => null)) as {
          unlocked?: boolean;
          mailchimp?: StoredUnlock["mailchimp"];
        } | null;
        if (cancelled || !data?.unlocked || !data.mailchimp) return;
        setStoredUnlock({ email, goal, mailchimp: data.mailchimp });
      } catch {
        // Keep the existing unlock. Retagging is best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quiz.phase, quiz.goal, unlock]);

  const questions = questionsFor(quiz.goal);
  const question = questions[Math.min(quiz.step, questions.length - 1)];
  const selected: Choice | undefined =
    question?.id === "goal"
      ? quiz.goal
        ? choiceForGoal(quiz.goal)
        : undefined
      : question
        ? quiz.answers[question.id]
        : undefined;

  function select(choice: Choice) {
    if (!question) return;
    if (question.id === "goal") {
      const goal = goalFromChoice(choice);
      const allowed = new Set(questionsFor(goal).map((item) => item.id));
      setSession({
        ...quiz,
        goal,
        answers: Object.fromEntries(
          Object.entries(quiz.answers).filter(([id]) => allowed.has(id)),
        ) as Answers,
      });
      return;
    }
    setSession({ ...quiz, answers: { ...quiz.answers, [question.id]: choice } });
  }

  function next() {
    if (!question || !selected || (!quiz.goal && question.id !== "goal")) return;
    const goal = question.id === "goal" ? goalFromChoice(selected) : quiz.goal;
    const length = questionsFor(goal).length;
    if (quiz.step >= length - 1 && goal && isQuizComplete(goal, quiz.answers)) {
      setSession({ ...quiz, phase: "results", goal });
      return;
    }
    setSession({
      ...quiz,
      step: Math.min(quiz.step + 1, length - 1),
      goal: goal ?? quiz.goal,
    });
  }

  const title = "Ops Scalability Score";
  const subtitle = quiz.phase === "results" && unlock ? "vs similar SMBs (directional)" : undefined;

  const report =
    quiz.phase === "results" && quiz.goal && isQuizComplete(quiz.goal, quiz.answers)
      ? scoreQuiz(quiz.goal, quiz.answers)
      : null;

  return (
    <StartQuizProvider onStart={() => setSession({ phase: "quiz", step: 0, goal: null, answers: {} })}>
      <Header title={title} subtitle={subtitle} />
      <main id="main" className="flex-1">
        {quiz.phase === "landing" || !question ? children : null}
        {quiz.phase === "quiz" && question ? (
          <Quiz
            question={question}
            step={quiz.step}
            selected={selected}
            onSelect={select}
            onBack={() => setSession({ ...quiz, step: Math.max(0, quiz.step - 1) })}
            onNext={next}
          />
        ) : null}
        {report ? (
          <Results
            report={report}
            unlock={unlock}
            onUnlocked={(nextUnlock) => {
              const email = normalizeEmail(nextUnlock.email);
              if (!isEmail(email)) return;
              setStoredUnlock({ ...nextUnlock, email });
            }}
            onRetake={() => setSession({ ...EMPTY_SESSION, phase: "quiz" })}
          />
        ) : null}
      </main>
      <SiteFooter />
    </StartQuizProvider>
  );
}
