export const BURRITO_PROMPT = `First, we need to pull the bag of burritos out of the freezer. Next, we'll remove the packaging from the frozen burrito. After we've removed the packaging, we need to decide if we'll stick it in the oven or microwave it. If we stick it in the oven, we need to put the burrito on an oven-safe surface, typically a baking sheet. Then, we'll need to ensure the oven has been pre-heated to 450 degrees. After the oven has pre-heated, we'll put the baking sheet with the burrito in the oven for 22 minutes. If we decide to microwave it, we just need to put the frozen burrito on a paper plate and press the start button 3x for a minute and a half cook time. If we used the oven, we'll pull it out, remove it from the baking sheet with a spatula and place it on a paper plate and let cool for 5 minutes before eating. If it was microwaved, we'll pull it out of the microwave and let cool for 2 minutes before eating.`;

export type ParsedDecision = {
  question: string;
  yesKey: string;
  noKey: string;
  yesSteps: string[];
  noSteps: string[];
};

export type ParsedProcess = {
  title: string;
  prelude: string[];
  decision: ParsedDecision | null;
  epilogue: string[];
};

const SEQ_LEAD =
  /^(?:first|next|then|after that|afterwards|finally|lastly)(?:,|\b)\s+/i;
const AFTER_CLAUSE = /^after\s+[^,]+,\s+/i;
const SUBJECT =
  /^(?:we (?:just )?need to |we'll |we will |we |you (?:need to |should )?|(?:just )?need to )/i;

const ACTION_SPLIT =
  /(?:\s+and then\s+)|(?:;\s+)|(?:,\s+(?=remove |place |put |press |let |pull |ensure |bake |cook |cool |send |create |stamp |file ))|(?:\s+and\s+(?=let |press |put |remove |place |pull |ensure |pre-?heat |bake |cook |cool |send |create |stamp |file |open ))/i;

function cleanLabel(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[.?,!\s]+|[.?,!\s]+$/g, "")
    .replace(SEQ_LEAD, "")
    .replace(AFTER_CLAUSE, "")
    .replace(SUBJECT, "")
    .replace(SUBJECT, "")
    .trim()
    .replace(/^(.)/, (ch) => ch.toUpperCase());
}

function splitActions(text: string): string[] {
  const stripped = text.replace(/[.?!]$/, "").trim();
  const triple = stripped.match(/^(.+?),\s+(.+?),\s+and\s+(.+)$/i);
  if (triple && !/typically|usually|including/i.test(stripped)) {
    return [triple[1], triple[2], triple[3]].map(cleanLabel).filter((part) => part.length > 1);
  }
  return stripped
    .split(ACTION_SPLIT)
    .map(cleanLabel)
    .filter((part) => part.length > 1);
}

function looksNumbered(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  return lines.length > 1 && lines.filter((line) => /^\s*(?:\d+[.)]|[-*])\s+/.test(line)).length >= 2;
}

function splitNumbered(text: string): { heading: string | null; items: string[] } {
  const lines = text
    .split(/\r?\n+/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*]|\d+[.)])\s+/, "")
        .replace(/^step\s+\d+[:.\-]\s*/i, "")
        .trim(),
    )
    .filter(Boolean);
  const heading =
    lines[0] &&
    lines[0].length <= 80 &&
    !/^(if|first|next|then)\b/i.test(lines[0]) &&
    !/^\d+[.)]/.test(text.trim())
      ? lines[0]
      : null;
  const items = heading && lines[0] === heading ? lines.slice(1) : lines;
  return { heading, items };
}

function splitProse(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized
    .split(/(?<=[.?!])\s+(?=[A-Z]|If |Then |Next |After |Finally |First |Last )/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function shortKey(text: string): string {
  const known = text.match(
    /\b(oven|microwave|microwaved|freezer|fridge|email|phone|approve|reject|yes|no)\b/i,
  );
  if (known) {
    const word = known[1].toLowerCase();
    return word === "microwaved" ? "microwave" : word;
  }
  return cleanLabel(text)
    .toLowerCase()
    .replace(/^(stick it in the |use the |used the |the |to )/, "")
    .slice(0, 40);
}

function toQuestion(left: string, right: string): string {
  const a = shortKey(left);
  const b = shortKey(right);
  if (a && b && a !== b) {
    return `${a.charAt(0).toUpperCase()}${a.slice(1)} or ${b}?`;
  }
  return `${cleanLabel(left)} or ${cleanLabel(right)}?`;
}

function isYesNoQuestion(sentence: string): boolean {
  return /^(if|whether)\b/i.test(sentence.trim()) && /[?]$/.test(sentence.trim());
}

function parseDecision(sentence: string): ParsedDecision | null {
  const match = sentence.match(
    /decid(?:e|ing)(?:\s+if|\s+whether)?(?:\s+we(?:'ll| will)?|\s+to)?\s+(.+?)\s+or\s+(.+?)(?:[.?!]|$)/i,
  );
  if (match) {
    return {
      question: toQuestion(match[1], match[2]),
      yesKey: shortKey(match[1]),
      noKey: shortKey(match[2]),
      yesSteps: [],
      noSteps: [],
    };
  }
  if (isYesNoQuestion(sentence)) {
    const q = cleanLabel(sentence.replace(/[?]$/, ""));
    return {
      question: q.endsWith("?") ? q : `${q}?`,
      yesKey: "yes",
      noKey: "no",
      yesSteps: [],
      noSteps: [],
    };
  }
  const whether = sentence.match(/whether to\s+(.+?)\s+or\s+(.+?)(?:[.?!]|$)/i);
  if (whether) {
    return {
      question: toQuestion(whether[1], whether[2]),
      yesKey: shortKey(whether[1]),
      noKey: shortKey(whether[2]),
      yesSteps: [],
      noSteps: [],
    };
  }
  return null;
}

function parseIf(sentence: string): { condition: string; actions: string[] } | null {
  const trimmed = sentence.trim();
  const patterns = [
    /^if we used (?:the )?([^,]+),\s+(.+)/i,
    /^if it (?:was|were)\s+([^,]+),\s+(.+)/i,
    /^if we decide to ([^,]+),\s+(.+)/i,
    /^if we ([^,]+),\s+(.+)/i,
    /^if (?:the |it )([^,]+),\s+(.+)/i,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { condition: match[1].trim(), actions: splitActions(match[2]) };
    }
  }
  return null;
}

function sideForCondition(decision: ParsedDecision, condition: string): "yes" | "no" | null {
  const key = shortKey(condition);
  if (key === decision.yesKey || condition.toLowerCase().includes(decision.yesKey)) return "yes";
  if (key === decision.noKey || condition.toLowerCase().includes(decision.noKey)) return "no";
  if (decision.yesKey !== "yes" && decision.yesKey && key.includes(decision.yesKey)) return "yes";
  if (decision.noKey !== "no" && decision.noKey && key.includes(decision.noKey)) return "no";
  return null;
}

export function parseProcess(text: string): ParsedProcess {
  const trimmed = text.trim();
  if (!trimmed) return { title: "Untitled process", prelude: [], decision: null, epilogue: [] };

  let heading: string | null = null;
  let sentences: string[];
  if (looksNumbered(trimmed)) {
    const numbered = splitNumbered(trimmed);
    heading = numbered.heading;
    sentences = numbered.items;
  } else {
    sentences = splitProse(trimmed);
  }

  const prelude: string[] = [];
  let decision: ParsedDecision | null = null;
  const epilogue: string[] = [];
  let side: "yes" | "no" | "spine" = "spine";

  for (const sentence of sentences) {
    const foundDecision = parseDecision(sentence);
    if (foundDecision && !decision) {
      decision = foundDecision;
      side = "spine";
      continue;
    }

    const iff = parseIf(sentence);
    if (iff && decision) {
      const matched = sideForCondition(decision, iff.condition);
      if (matched) {
        side = matched;
        if (matched === "yes") decision.yesSteps.push(...iff.actions);
        else decision.noSteps.push(...iff.actions);
        continue;
      }
    }

    const actions = splitActions(sentence);
    if (!decision) {
      prelude.push(...actions);
      continue;
    }
    if (side === "yes") {
      decision.yesSteps.push(...actions);
      continue;
    }
    if (side === "no") {
      decision.noSteps.push(...actions);
      continue;
    }
    // Plain step right after a question-style decision belongs on the yes path.
    if (decision.yesSteps.length === 0 && decision.noSteps.length === 0) {
      decision.yesSteps.push(...actions);
      side = "yes";
      continue;
    }
    epilogue.push(...actions);
  }

  const title =
    heading ||
    prelude[0] ||
    decision?.question.replace(/[?]$/, "") ||
    "Untitled process";

  return { title, prelude, decision, epilogue };
}
