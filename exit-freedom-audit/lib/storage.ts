import { isChoice, isGoal, questionsFor, type Goal } from "./questions";
import { isQuizComplete, type Answers } from "./score";

export type Phase = "landing" | "quiz" | "results";

export type QuizSession = {
  phase: Phase;
  step: number;
  goal: Goal | null;
  answers: Answers;
};

export type StoredMailchimp = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  tags?: string[];
};

export type StoredUnlock = {
  email: string;
  goal: Goal;
  mailchimp: StoredMailchimp;
};

const SESSION_KEY = "efa-quiz-session";
const UNLOCK_KEY = "efa-unlock-v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readSession(): QuizSession | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<QuizSession>;
    if (data.phase !== "landing" && data.phase !== "quiz" && data.phase !== "results") return null;
    if (typeof data.step !== "number" || data.step < 0 || data.step > 20) return null;
    if (data.goal !== null && !isGoal(data.goal)) return null;
    if (!data.answers || typeof data.answers !== "object") return null;
    const answers: Answers = {};
    for (const [id, choice] of Object.entries(data.answers)) {
      if (isChoice(choice)) answers[id] = choice;
    }
    return { phase: data.phase, step: data.step, goal: data.goal ?? null, answers };
  } catch {
    return null;
  }
}

export function writeSession(session: QuizSession): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readUnlock(): StoredUnlock | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<StoredUnlock>;
    if (typeof data.email !== "string" || !data.email.includes("@")) return null;
    if (!isGoal(data.goal)) return null;
    if (!data.mailchimp || typeof data.mailchimp !== "object") return null;
    return { email: data.email, goal: data.goal, mailchimp: data.mailchimp };
  } catch {
    return null;
  }
}

export function writeUnlock(unlock: StoredUnlock): void {
  if (!canUseStorage()) return;
  localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlock));
}

export const EMPTY_SESSION: QuizSession = { phase: "landing", step: 0, goal: null, answers: {} };

export function normalizeSession(session: QuizSession): QuizSession {
  const questions = questionsFor(session.goal);
  let step = Math.min(session.step, Math.max(questions.length - 1, 0));
  if (!session.goal) step = 0;
  let phase = session.phase;
  if (phase === "results" && (!session.goal || !isQuizComplete(session.goal, session.answers))) {
    phase = "quiz";
  }
  return { ...session, phase, step };
}

const sessionListeners = new Set<() => void>();
let sessionSnapshot: QuizSession = EMPTY_SESSION;
let sessionReady = false;

export function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function getSessionSnapshot(): QuizSession {
  if (!canUseStorage()) return EMPTY_SESSION;
  if (!sessionReady) {
    sessionReady = true;
    const saved = readSession();
    sessionSnapshot = saved ? normalizeSession(saved) : EMPTY_SESSION;
  }
  return sessionSnapshot;
}

export function getServerSessionSnapshot(): QuizSession {
  return EMPTY_SESSION;
}

export function setSession(next: QuizSession): void {
  sessionSnapshot = next;
  sessionReady = true;
  writeSession(next);
  sessionListeners.forEach((listener) => listener());
}

const unlockListeners = new Set<() => void>();
let unlockSnapshot: StoredUnlock | null = null;
let unlockReady = false;

export function subscribeUnlock(listener: () => void): () => void {
  unlockListeners.add(listener);
  return () => {
    unlockListeners.delete(listener);
  };
}

export function getUnlockSnapshot(): StoredUnlock | null {
  if (!canUseStorage()) return null;
  if (!unlockReady) {
    unlockReady = true;
    unlockSnapshot = readUnlock();
  }
  return unlockSnapshot;
}

export function getServerUnlockSnapshot(): null {
  return null;
}

export function setStoredUnlock(next: StoredUnlock): void {
  unlockSnapshot = next;
  unlockReady = true;
  writeUnlock(next);
  unlockListeners.forEach((listener) => listener());
}
