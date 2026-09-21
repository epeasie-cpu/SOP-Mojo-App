export const BURRITO_PROMPT = `First, we need to pull the bag of burritos out of the freezer. Next, we'll remove the packaging from the frozen burrito. After we've removed the packaging, we need to decide if we'll stick it in the oven or microwave it. If we stick it in the oven, we need to put the burrito on an oven-safe surface, typically a baking sheet. Then, we'll need to ensure the oven has been pre-heated to 450 degrees. After the oven has pre-heated, we'll put the baking sheet with the burrito in the oven for 22 minutes. If we decide to microwave it, we just need to put the frozen burrito on a paper plate and press the start button 3x for a minute and a half cook time. If we used the oven, we'll pull it out, remove it from the baking sheet with a spatula and place it on a paper plate and let cool for 5 minutes before eating. If it was microwaved, we'll pull it out of the microwave and let cool for 2 minutes before eating.`;

export const TEA_PROMPT = `Fill a kettle with fresh water and turn it on to boil. While the water is heating, place a tea bag into an empty mug. Once the kettle whistles, carefully pour the boiling water over the tea bag until the mug is almost full. Now, decide how you prefer to drink your tea. If you plan to add milk, let the bag steep for five full minutes so the stronger flavor can cut through the dairy, then stir in a splash of cold milk. If you prefer your tea black, steep the bag for only three minutes to maintain a lighter, clean taste. Finally, remove the tea bag, discard it, and let the beverage cool slightly before drinking.`;

export const CASH_REGISTER_PROMPT = `First, open the cash register.
Second, is the cash register loaded?
If yes, pull money out.
If no, don't pull money out.`;

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
  /^(?:first|second|third|fourth|fifth|next|then|after that|afterwards|finally|lastly|now)(?:,|\b)\s+/i;
const LEAD_CLAUSE = /^(?:after|while|once|when)\s+[^,]+,\s+/i;
const SUBJECT =
  /^(?:we (?:just )?need to |we'll |we will |we |you (?:need to |should )?|(?:just )?need to )/i;

const ACTION_SPLIT =
  /(?:\s+and then\s+)|(?:,?\s+then\s+)|(?:;\s+)|(?:,\s+(?=remove |place |put |press |let |pull |ensure |bake |cook |cool |send |create |stamp |file |discard |stir |steep |pour ))|(?:\s+and\s+(?=let |press |put |remove |place |pull |ensure |pre-?heat |bake |cook |cool |send |create |stamp |file |open |turn |steep |stir |discard |pour ))/i;

function cleanLabel(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[.?,!\s]+|[.?,!\s]+$/g, "")
    .replace(SEQ_LEAD, "")
    .replace(LEAD_CLAUSE, "")
    .replace(SUBJECT, "")
    .replace(SUBJECT, "")
    .trim()
    .replace(/^(.)/, (ch) => ch.toUpperCase());
}

function keepLabel(part: string): boolean {
  return part.length > 1 && !/^(finally|lastly|then|next|now|afterwards)$/i.test(part);
}

function splitActions(text: string): string[] {
  const stripped = text
    .replace(/[.?!]$/, "")
    .replace(SEQ_LEAD, "")
    .replace(LEAD_CLAUSE, "")
    .trim();
  if (!stripped) return [];
  const triple = stripped.match(/^(.+?),\s+(.+?),\s+and\s+(.+)$/i);
  if (triple && !/typically|usually|including/i.test(stripped)) {
    return [triple[1], triple[2], triple[3]].map(cleanLabel).filter(keepLabel);
  }
  return stripped.split(ACTION_SPLIT).map(cleanLabel).filter(keepLabel);
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
    .split(/(?<=[.?!])\s+(?=[A-Z]|If |Then |Next |After |Finally |First |Second |Third |Last |Yes[:\s]|No[:\s])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function shortKey(text: string): string {
  const known = text.match(
    /\b(oven|microwave|microwaved|freezer|fridge|email|phone|approve|reject|yes|no|milk|black)\b/i,
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

const AUX =
  /^(?:is|are|does|do|can|should|will|has|have|was|were|am)\b(?!\s+not\b)/i;

function questionFromInterrogative(sentence: string): string {
  const stripped = cleanLabel(sentence.replace(/[?]$/, ""));
  const noAux = stripped.replace(
    /^(?:is|are|does|do|can|should|will|has|have|was|were|am)\s+/i,
    "",
  );
  const q = cleanLabel(noAux.replace(/^(?:the )\s*/i, ""));
  return q.endsWith("?") ? q : `${q}?`;
}

function parseInterrogative(sentence: string): ParsedDecision | null {
  const trimmed = sentence.trim();
  const withoutLead = trimmed.replace(SEQ_LEAD, "");
  if (!AUX.test(withoutLead)) return null;
  const hasMark = /[?]$/.test(withoutLead);
  const afterOrdinal = SEQ_LEAD.test(trimmed);
  if (!hasMark && !afterOrdinal) return null;
  return {
    question: questionFromInterrogative(withoutLead),
    yesKey: "yes",
    noKey: "no",
    yesSteps: [],
    noSteps: [],
  };
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
  const how = sentence.match(
    /\bdecid(?:e|ing)\s+((?:how|what|which|whether)\b.+?)(?:[.?!]|$)/i,
  );
  if (how) {
    const q = cleanLabel(how[1]);
    return {
      question: q.endsWith("?") ? q : `${q}?`,
      yesKey: "yes",
      noKey: "no",
      yesSteps: [],
      noSteps: [],
    };
  }
  if (/\bdecid(?:e|ing)\b/i.test(sentence) && !/\bor\b/i.test(sentence)) {
    const rest = sentence.replace(/^.*?\bdecid(?:e|ing)\s+/i, "");
    const q = cleanLabel(rest);
    if (q.length > 2) {
      return {
        question: q.endsWith("?") ? q : `${q}?`,
        yesKey: "yes",
        noKey: "no",
        yesSteps: [],
        noSteps: [],
      };
    }
  }
  return parseInterrogative(sentence);
}

function parseIf(sentence: string): { condition: string; actions: string[] } | null {
  const trimmed = sentence.trim();
  const bare = trimmed.match(/^if\s+(yes|no|not)\b\s*[,:]?\s*(.*)$/i);
  if (bare) {
    const condition = /^not$/i.test(bare[1]) ? "no" : bare[1].toLowerCase();
    return { condition, actions: splitActions(bare[2] || "") };
  }
  const labeled = trimmed.match(/^(yes|no)\s*[:\-]\s*(.+)$/i);
  if (labeled) {
    return { condition: labeled[1].toLowerCase(), actions: splitActions(labeled[2]) };
  }
  const patterns = [
    /^if we used (?:the )?([^,]+),\s+(.+)/i,
    /^if it (?:was|were)\s+([^,]+),\s+(.+)/i,
    /^if we decide to ([^,]+),\s+(.+)/i,
    /^if you plan to ([^,]+),\s+(.+)/i,
    /^if you prefer (?:your )?([^,]+),\s+(.+)/i,
    /^if you (?:want to |would like to |choose to )?([^,]+),\s+(.+)/i,
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
  const hay = condition.toLowerCase().trim();
  if (/^(yes|y)$/i.test(key) || /^(yes|y)$/i.test(hay)) return "yes";
  if (/^(no|n|not)$/i.test(key) || /^(no|n|not)$/i.test(hay)) return "no";
  if (decision.yesKey && decision.yesKey !== "yes") {
    if (key === decision.yesKey || hay.includes(decision.yesKey) || key.includes(decision.yesKey)) {
      return "yes";
    }
  }
  if (decision.noKey && decision.noKey !== "no") {
    if (key === decision.noKey || hay.includes(decision.noKey) || key.includes(decision.noKey)) {
      return "no";
    }
  }
  return null;
}

function isJoinCue(sentence: string): boolean {
  return /^(finally|lastly|afterwards|after that|in (?:either|both) case)\b/i.test(sentence.trim());
}

function refineQuestion(decision: ParsedDecision) {
  if (
    decision.yesKey &&
    decision.noKey &&
    decision.yesKey !== "yes" &&
    decision.noKey !== "no"
  ) {
    decision.question = toQuestion(decision.yesKey, decision.noKey);
  }
}

function assignIf(
  decision: ParsedDecision,
  iff: { condition: string; actions: string[] },
): "yes" | "no" | null {
  const matched = sideForCondition(decision, iff.condition);
  if (matched) {
    if (matched === "yes") decision.yesSteps.push(...iff.actions);
    else decision.noSteps.push(...iff.actions);
    return matched;
  }
  if (decision.yesSteps.length === 0) {
    const key = shortKey(iff.condition);
    if (key) decision.yesKey = key;
    decision.yesSteps.push(...iff.actions);
    return "yes";
  }
  if (decision.noSteps.length === 0) {
    const key = shortKey(iff.condition);
    if (key) decision.noKey = key;
    decision.noSteps.push(...iff.actions);
    return "no";
  }
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
    if (iff) {
      if (!decision) {
        decision = {
          question: `${cleanLabel(iff.condition)}?`,
          yesKey: shortKey(iff.condition) || "yes",
          noKey: "no",
          yesSteps: [...iff.actions],
          noSteps: [],
        };
        side = "yes";
        continue;
      }
      const assigned = assignIf(decision, iff);
      if (assigned) {
        side = assigned;
        continue;
      }
    }

    const actions = splitActions(sentence);
    if (!decision) {
      prelude.push(...actions);
      continue;
    }
    if (
      isJoinCue(sentence) &&
      decision.yesSteps.length > 0 &&
      decision.noSteps.length > 0
    ) {
      epilogue.push(...actions);
      side = "spine";
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

  if (decision) refineQuestion(decision);

  const title =
    heading ||
    prelude[0] ||
    decision?.question.replace(/[?]$/, "") ||
    "Untitled process";

  return { title, prelude, decision, epilogue };
}
