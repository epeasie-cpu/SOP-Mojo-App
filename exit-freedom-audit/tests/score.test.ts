import { describe, expect, it } from "vitest";
import {
  QUIZ_LENGTH,
  questionsFor,
  type Choice,
  type Goal,
} from "@/lib/questions";
import {
  AI_AMPLIFIES,
  AI_RETEACH,
  bandFor,
  reportText,
  scoreQuiz,
  shareSummaryFromReport,
  type Answers,
} from "@/lib/score";

const GOALS: Goal[] = ["exit", "family", "absentee", "chaos"];

function fill(goal: Goal, choice: Choice, overrides: Answers = {}): Answers {
  const answers: Answers = {};
  for (const question of questionsFor(goal)) {
    if (!question.weights) continue;
    answers[question.id] = choice;
  }
  return { ...answers, ...overrides };
}

describe("quiz shape", () => {
  it("asks the goal, eight core gut checks, and two add-ons", () => {
    for (const goal of GOALS) {
      const questions = questionsFor(goal);
      expect(questions).toHaveLength(QUIZ_LENGTH);
      expect(questions[0].id).toBe("goal");
      expect(questions[0].weights).toBeUndefined();
      expect(questions[3].id).toBe("sick");
      expect(questions[3].prompt).toMatch(/out sick/i);
      const scored = questions.filter((question) => question.weights);
      expect(scored).toHaveLength(10);
    }
    const exitIds = questionsFor("exit").map((question) => question.id);
    const familyIds = questionsFor("family").map((question) => question.id);
    expect(exitIds.filter((id) => id.startsWith("exit-"))).toHaveLength(2);
    expect(familyIds.some((id) => id.startsWith("exit-"))).toBe(false);
  });

  it("stays answerable from memory", () => {
    const text = GOALS.flatMap((goal) => questionsFor(goal).map((question) => question.prompt)).join("\n");
    expect(text).not.toMatch(/call your|ask your staff|hunt through|count your|look up the/i);
  });
});

describe("scoring", () => {
  it("bands the headline score", () => {
    expect(bandFor(0)).toEqual({ band: "Fragile", label: "Fragile — key-person dependent" });
    expect(bandFor(39).band).toBe("Fragile");
    expect(bandFor(40)).toEqual({ band: "Building", label: "Building — not yet scalable" });
    expect(bandFor(69).band).toBe("Building");
    expect(bandFor(70).band).toBe("Ready");
    expect(bandFor(100).label).toBe("Ready — can run without you");
  });

  it("scores every A as fragile and every D as ready", () => {
    const low = scoreQuiz("chaos", fill("chaos", "A"));
    const high = scoreQuiz("family", fill("family", "D"));
    expect(low.score).toBe(0);
    expect(low.band).toBe("Fragile");
    expect(high.score).toBe(100);
    expect(high.band).toBe("Ready");
    expect(low.topGaps.map((gap) => gap.id)).toEqual(["coverage", "documentation"]);
    expect(low.metrics.sellability.value).toBe("Lower band");
    expect(high.metrics.sellability.value).toBe("Higher band");
    expect(low.metrics.opsReadiness.value).toBe("Stalls quickly");
    expect(high.metrics.opsReadiness.value).toBe("Runs without you");
    expect(low.metrics.aiReadiness.value).toBe("Not ready");
    expect(high.metrics.aiReadiness.value).toBe("Usable");
    expect(low.metrics.peerBand.value).toBe("Behind peers");
    expect(high.metrics.peerBand.value).toBe("Ahead of peers");
    expect(low.metrics.diligenceRisk.value).toBe("High risk");
    expect(high.metrics.diligenceRisk.value).toBe("Lower risk");
    expect(low.metrics.absenteeRunRate.value).toBe("About 1–2 days");
    expect(high.metrics.absenteeRunRate.value).toBe("A normal month");
    expect(low.gaps[0]).toMatchObject({ id: "ai", visible: AI_RETEACH });
    expect(low.topGaps.map((gap) => gap.id)).toEqual(["coverage", "documentation"]);
    expect(high.gaps.some((gap) => gap.id === "ai")).toBe(false);
    expect(reportText(low)).toContain(AI_AMPLIFIES);
    expect(reportText(low)).toContain("re-teaching the model");
    expect(low.metrics.aiReadiness.note).toBe(AI_AMPLIFIES);
  });

  it("puts the weakest dimension in the two clear gaps", () => {
    const report = scoreQuiz("exit", fill("exit", "D", { sick: "A" }));
    expect(report.score).toBe(90);
    expect(report.dimensions.coverage).toBe(57);
    expect(report.topGaps.map((gap) => gap.id)).toEqual(["coverage", "documentation"]);
    expect(report.topGaps[0].title).toMatch(/Coverage/);
    expect(report.topGaps).toHaveLength(2);
    expect(report.gaps[0].score).toBeLessThanOrEqual(report.gaps[1].score);
  });

  it("never states a precise industry multiple", () => {
    for (const goal of GOALS) {
      for (const choice of ["A", "C", "D"] as Choice[]) {
        const report = scoreQuiz(goal, fill(goal, choice));
        const text = reportText(report);
        expect(text).not.toMatch(/\d+(\.\d+)?\s*[x×]/i);
        expect(text).not.toMatch(/ebitda|revenue multiple|times revenue/i);
        expect(report.metrics.sellability.note).toMatch(/not a valuation/i);
        expect(report.metrics.sellability.note).toMatch(/not an industry multiple/i);
        expect(report.metrics.sellability.value).toMatch(/band/i);
      }
    }
  });

  it("builds a score summary for the call request", () => {
    const report = scoreQuiz("absentee", fill("absentee", "C"));
    const summary = shareSummaryFromReport(report);
    expect(summary.gaps.length).toBeGreaterThan(0);
    expect(summary.gaps.length).toBeLessThanOrEqual(3);
    expect(summary.breakout).toHaveLength(6);
    expect(summary.gaps.join("\n")).toContain("Document first, then automate");
  });
});
