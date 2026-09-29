import {
  CHOICE_SCORE,
  DIMENSIONS,
  type Choice,
  type Dimension,
  type Goal,
  type Question,
  questionsFor,
} from "./questions";

export type Answers = Partial<Record<string, Choice>>;

export type Band = "Fragile" | "Building" | "Ready";

export type GapId = Dimension | "ai";

export type Gap = {
  id: GapId;
  score: number;
  title: string;
  visible: string;
  critical: boolean;
  quickWin: boolean;
};

export const AI_AMPLIFIES =
  "AI amplifies what's written down. Tribal knowledge stays tribal.";

export const AI_RETEACH =
  "Automating this today would mean re-teaching the model every week. Document first, then automate.";

export type Metric = {
  id: string;
  title: string;
  subtitle: string;
  /** Short label. This is what blurs before unlock. */
  value: string;
  detail: string;
  note: string;
};

export type DimensionScores = Record<Dimension, number>;

export type ScoreReport = {
  goal: Goal;
  score: number;
  band: Band;
  bandLabel: string;
  dimensions: DimensionScores;
  gaps: Gap[];
  topGaps: Gap[];
  metrics: {
    sellability: Metric;
    opsReadiness: Metric;
    aiReadiness: Metric;
    peerBand: Metric;
    diligenceRisk: Metric;
    absenteeRunRate: Metric;
  };
};

const GAP_PRIORITY: Dimension[] = [
  "coverage",
  "documentation",
  "maps",
  "owner",
  "tools",
  "maintenance",
];

const QUICK_WIN: ReadonlySet<Dimension> = new Set([
  "documentation",
  "maps",
  "tools",
  "maintenance",
]);

export function bandFor(score: number): { band: Band; label: string } {
  if (score < 40) return { band: "Fragile", label: "Fragile — key-person dependent" };
  if (score < 70) return { band: "Building", label: "Building — not yet scalable" };
  return { band: "Ready", label: "Ready — can run without you" };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function dimensionScore(questions: Question[], answers: Answers, key: Dimension): number {
  let got = 0;
  let weightSum = 0;
  for (const question of questions) {
    const weight = question.weights?.[key];
    if (!weight) continue;
    const choice = answers[question.id];
    if (!choice) continue;
    got += (CHOICE_SCORE[choice] / 3) * weight;
    weightSum += weight;
  }
  if (weightSum === 0) return 0;
  return Math.round((got / weightSum) * 100);
}

function headlineScore(questions: Question[], answers: Answers): number {
  let raw = 0;
  let max = 0;
  for (const question of questions) {
    if (!question.weights) continue;
    const choice = answers[question.id];
    if (!choice) continue;
    raw += CHOICE_SCORE[choice];
    max += 3;
  }
  if (max === 0) return 0;
  return Math.round((raw / max) * 100);
}

function gapCopy(id: Dimension, score: number): { title: string; visible: string } {
  const low = score < 40;
  const mid = score < 70;
  switch (id) {
    case "coverage":
      if (low) {
        return {
          title: "Coverage — work stalls when one person is out",
          visible: "Work stalls when one person is out",
        };
      }
      if (mid) {
        return {
          title: "Coverage — handoffs still depend on who is in the room",
          visible: "Handoffs still depend on who is in the room",
        };
      }
      return {
        title: "Coverage — a few handoffs still have no backup",
        visible: "A few handoffs still have no backup",
      };
    case "documentation":
      if (low) {
        return {
          title: "Documentation — critical SOPs are still missing",
          visible: "Critical SOPs feel incomplete",
        };
      }
      if (mid) {
        return {
          title: "Documentation — SOPs cover only part of critical work",
          visible: "Critical SOPs feel incomplete",
        };
      }
      return {
        title: "Documentation — a few critical SOPs still lag the work",
        visible: "A few critical SOPs still lag",
      };
    case "maps":
      if (low) {
        return {
          title: "Maps — few workflows have a visual flowchart",
          visible: "Few workflows have a visual map",
        };
      }
      if (mid) {
        return {
          title: "Maps — some workflows are written, few are visual",
          visible: "Few workflows have a visual map",
        };
      }
      return {
        title: "Maps — a few core workflows still have no picture",
        visible: "A few core workflows still have no picture",
      };
    case "tools":
      if (low) {
        return {
          title: "Tools — the same job is done more than one way",
          visible: "The same job is done different ways",
        };
      }
      if (mid) {
        return {
          title: "Tools — important jobs still drift between people",
          visible: "The same job still drifts between people",
        };
      }
      return {
        title: "Tools — a little drift is still uncorrected",
        visible: "A little tool drift is still uncorrected",
      };
    case "owner":
      if (low) {
        return {
          title: "Owner load — you are still in too many handoffs",
          visible: "Owner still in too many handoffs",
        };
      }
      if (mid) {
        return {
          title: "Owner load — ordinary decisions still find you",
          visible: "Owner still in too many handoffs",
        };
      }
      return {
        title: "Owner load — a few ordinary calls still land on you",
        visible: "A few ordinary calls still land on you",
      };
    case "maintenance":
      if (low) {
        return {
          title: "Upkeep — process changes don't update the write-up",
          visible: "Write-ups go stale when work changes",
        };
      }
      if (mid) {
        return {
          title: "Upkeep — updates to the work lag the SOP",
          visible: "Write-ups go stale when work changes",
        };
      }
      return {
        title: "Upkeep — some changes still skip the SOP",
        visible: "Some changes still skip the SOP",
      };
  }
}

function buildGaps(dimensions: DimensionScores): Gap[] {
  const gaps = DIMENSIONS.map((id) => {
    const score = dimensions[id];
    const copy = gapCopy(id, score);
    return {
      id,
      score,
      title: copy.title,
      visible: copy.visible,
      critical: score < 45,
      quickWin: QUICK_WIN.has(id) && score < 75,
    };
  });
  gaps.sort((a, b) => a.score - b.score || GAP_PRIORITY.indexOf(a.id) - GAP_PRIORITY.indexOf(b.id));
  return gaps;
}

function sellability(dimensions: DimensionScores): Metric {
  const index = mean([
    dimensions.documentation,
    dimensions.coverage,
    dimensions.owner,
    dimensions.maps,
  ]);
  const value = index < 40 ? "Lower band" : index < 70 ? "Middle band" : "Higher band";
  const detail =
    index < 40
      ? "Key-person risk would likely compress what a buyer pays."
      : index < 70
        ? "Partial systems. Expect a diligence haircut, not a clean transfer."
        : "Transferable ops support a cleaner conversation with a buyer.";
  return {
    id: "sellability",
    title: "Sellability",
    subtitle: "What a buyer might pay (directional band)",
    value,
    detail,
    note: "Directional estimate from your answers. Not a valuation and not an industry multiple.",
  };
}

function opsReadiness(dimensions: DimensionScores): Metric {
  const index = mean([dimensions.coverage, dimensions.documentation, dimensions.owner]);
  const value =
    index < 35 ? "Stalls quickly" : index < 55 ? "Limps without you" : index < 75 ? "Core can continue" : "Runs without you";
  const detail =
    index < 35
      ? "Ordinary work waits when you or one other person is out."
      : index < 55
        ? "The week moves slowly, and the pile waits for you."
        : index < 75
          ? "Core work can continue. Exceptions still find you."
          : "A normal stretch of core work can close without you.";
  return {
    id: "opsReadiness",
    title: "Ops readiness",
    subtitle: "Can the business run without you?",
    value,
    detail,
    note: "From your coverage, documentation, and owner-load answers.",
  };
}

function aiReadiness(dimensions: DimensionScores): Metric {
  const index = mean([
    dimensions.documentation,
    dimensions.tools,
    dimensions.maps,
    dimensions.maintenance,
  ]);
  const value = index < 40 ? "Not ready" : index < 70 ? "Early" : "Usable";
  const detail =
    index < 40
      ? "AI needs documentation as the source of truth. Without SOPs and maps, automation means re-teaching the model every week."
      : index < 70
        ? "Some SOPs exist. Weak documentation or handoffs still mean re-teaching a model instead of handing it a source of truth."
        : "Core work is documented enough to automate in slices. The write-up is the source of truth.";
  return {
    id: "aiReadiness",
    title: "AI implementation readiness",
    subtitle: "How ready you are to automate ops",
    value,
    detail,
    note: AI_AMPLIFIES,
  };
}

/** Docs or handoffs below a solid score mean automation would re-teach the model. */
function aiReadinessGap(dimensions: DimensionScores): Gap | null {
  const docsWeak = dimensions.documentation < 70;
  const handoffsWeak = dimensions.coverage < 70;
  if (!docsWeak && !handoffsWeak) return null;
  const score = Math.min(
    docsWeak ? dimensions.documentation : 100,
    handoffsWeak ? dimensions.coverage : 100,
  );
  return {
    id: "ai",
    score,
    title: AI_RETEACH,
    visible: AI_RETEACH,
    critical: score < 45,
    quickWin: true,
  };
}

function peerBand(score: number): Metric {
  const value = score < 40 ? "Behind peers" : score < 70 ? "Mid peers" : "Ahead of peers";
  const detail =
    score < 40
      ? "Behind many similar owner-led SMBs on written ops."
      : score < 70
        ? "Around the middle of similar SMBs on written ops."
        : "Ahead of many similar SMBs on written ops.";
  return {
    id: "peerBand",
    title: "Peer band",
    subtitle: "Where you sit vs similar SMBs",
    value,
    detail,
    note: "Directional comparison from this quiz, not a market study.",
  };
}

function diligenceRisk(dimensions: DimensionScores): Metric {
  const readiness = mean([
    dimensions.documentation,
    dimensions.maps,
    dimensions.tools,
    dimensions.maintenance,
  ]);
  const risk = 100 - readiness;
  const value =
    risk >= 70 ? "High risk" : risk >= 45 ? "Elevated risk" : risk >= 25 ? "Moderate risk" : "Lower risk";
  const detail =
    risk >= 70
      ? "A buyer would live in your inbox and your head."
      : risk >= 45
        ? "Core gaps would become their own diligence workstream."
        : risk >= 25
          ? "Expected questions, with contained gaps."
          : "A pack exists for the usual diligence questions.";
  return {
    id: "diligenceRisk",
    title: "Buyer diligence risk",
    subtitle: "How painful diligence would feel",
    value,
    detail,
    note: "Directional read on how heavy a buyer's questions would feel.",
  };
}

function absenteeRunRate(dimensions: DimensionScores): Metric {
  const index = mean([dimensions.coverage, dimensions.owner]);
  const value =
    index < 30
      ? "About 1–2 days"
      : index < 55
        ? "Inside a week"
        : index < 75
          ? "A couple of weeks"
          : "A normal month";
  const detail =
    index < 30
      ? "Core work likely stalls within a couple of days."
      : index < 55
        ? "It limps inside a week, with a pile waiting on you."
        : index < 75
          ? "Core work holds for a couple of weeks. Exceptions wait."
          : "A normal month of core work can run from the system.";
  return {
    id: "absenteeRunRate",
    title: "Absentee run-rate",
    subtitle: "How long before things stall",
    value,
    detail,
    note: "Directional, from how you described coverage. Not a stopwatch.",
  };
}

export function isQuizComplete(goal: Goal, answers: Answers): boolean {
  return questionsFor(goal)
    .filter((question) => question.weights)
    .every((question) => Boolean(answers[question.id]));
}

export function scoreQuiz(goal: Goal, answers: Answers): ScoreReport {
  const questions = questionsFor(goal);
  const dimensions = {
    documentation: dimensionScore(questions, answers, "documentation"),
    coverage: dimensionScore(questions, answers, "coverage"),
    maps: dimensionScore(questions, answers, "maps"),
    tools: dimensionScore(questions, answers, "tools"),
    owner: dimensionScore(questions, answers, "owner"),
    maintenance: dimensionScore(questions, answers, "maintenance"),
  } satisfies DimensionScores;
  const score = headlineScore(questions, answers);
  const band = bandFor(score);
  const dimensionGaps = buildGaps(dimensions);
  const aiGap = aiReadinessGap(dimensions);
  const gaps = aiGap ? [aiGap, ...dimensionGaps] : dimensionGaps;
  return {
    goal,
    score,
    band: band.band,
    bandLabel: band.label,
    dimensions,
    gaps,
    topGaps: dimensionGaps.slice(0, 2),
    metrics: {
      sellability: sellability(dimensions),
      opsReadiness: opsReadiness(dimensions),
      aiReadiness: aiReadiness(dimensions),
      peerBand: peerBand(score),
      diligenceRisk: diligenceRisk(dimensions),
      absenteeRunRate: absenteeRunRate(dimensions),
    },
  };
}

export type ShareSummary = ReturnType<typeof shareSummaryFromReport>;

export function shareSummaryFromReport(report: ScoreReport) {
  return {
    score: report.score,
    bandLabel: report.bandLabel,
    documentation: report.dimensions.documentation,
    coverage: report.dimensions.coverage,
    maps: report.dimensions.maps,
    tools: report.dimensions.tools,
    gaps: report.gaps.slice(0, 3).map((gap) => gap.title),
    breakout: Object.values(report.metrics).map((metric) => ({
      label: metric.title,
      value: `${metric.value} — ${metric.detail}`,
    })),
  };
}

/** Text that must never read like a researched valuation multiple. */
export function reportText(report: ScoreReport): string {
  const metrics = Object.values(report.metrics);
  return [
    report.bandLabel,
    ...report.gaps.flatMap((gap) => [gap.title, gap.visible]),
    ...metrics.flatMap((metric) => [metric.title, metric.subtitle, metric.value, metric.detail, metric.note]),
  ].join("\n");
}
