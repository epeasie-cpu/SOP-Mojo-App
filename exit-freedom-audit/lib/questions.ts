export const GOALS = ["exit", "family", "absentee", "chaos"] as const;
export type Goal = (typeof GOALS)[number];

export const CHOICES = ["A", "B", "C", "D"] as const;
export type Choice = (typeof CHOICES)[number];

/** A is the weakest ops answer, D is the strongest. The goal question is not scored. */
export const CHOICE_SCORE: Record<Choice, number> = { A: 0, B: 1, C: 2, D: 3 };

export const DIMENSIONS = [
  "documentation",
  "coverage",
  "maps",
  "tools",
  "owner",
  "maintenance",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type Weights = Partial<Record<Dimension, number>>;

export type Option = {
  id: Choice;
  label: string;
  goal?: Goal;
};

export type Question = {
  id: string;
  prompt: string;
  options: Option[];
  /** Absent on the goal question, which only routes the two add-ons. */
  weights?: Weights;
};

export function isGoal(value: unknown): value is Goal {
  return typeof value === "string" && (GOALS as readonly string[]).includes(value);
}

export function isChoice(value: unknown): value is Choice {
  return typeof value === "string" && (CHOICES as readonly string[]).includes(value);
}

const GOAL_QUESTION: Question = {
  id: "goal",
  prompt: "What kind of freedom are you scoring for?",
  options: [
    { id: "A", label: "Sell or step out in the next few years", goal: "exit" },
    { id: "B", label: "Be more present for kids or family", goal: "family" },
    { id: "C", label: "Run the business while I'm away", goal: "absentee" },
    { id: "D", label: "Less chaos in the week I already have", goal: "chaos" },
  ],
};

const CORE: Question[] = [
  {
    id: "written",
    prompt:
      "How much of the recurring work that keeps the doors open is written down well enough that you would not have to explain it?",
    weights: { documentation: 3 },
    options: [
      { id: "A", label: "Almost none — it lives in my head" },
      { id: "B", label: "A few jobs, roughly a quarter" },
      { id: "C", label: "About half of the recurring work" },
      { id: "D", label: "Most recurring work has a current SOP" },
    ],
  },
  {
    id: "handoff",
    prompt: "When you hand a core workflow to someone else, what can they follow?",
    weights: { maps: 3, documentation: 1 },
    options: [
      { id: "A", label: "A conversation and a hope" },
      { id: "B", label: "Slack, memory, or a doc dump" },
      { id: "C", label: "A written SOP" },
      { id: "D", label: "An SOP plus a flowchart" },
    ],
  },
  {
    id: "sick",
    prompt: "When a key person is out sick, how does work continue?",
    weights: { coverage: 3 },
    options: [
      { id: "A", label: "It mostly waits until they get back" },
      { id: "B", label: "Someone else guesses from Slack / memory" },
      { id: "C", label: "We have a written SOP they can follow" },
      { id: "D", label: "SOP + flowchart — anyone can run it" },
    ],
  },
  {
    id: "tools",
    prompt: "When two people do the same job, do they use the same tools and steps?",
    weights: { tools: 3 },
    options: [
      { id: "A", label: "Everyone has their own way" },
      { id: "B", label: "Mostly the same, with lots of exceptions" },
      { id: "C", label: "The important jobs share one way" },
      { id: "D", label: "One documented way, and drift gets fixed" },
    ],
  },
  {
    id: "owner",
    prompt: "How many ordinary decisions this week still wait on you?",
    weights: { owner: 3 },
    options: [
      { id: "A", label: "Most of them — people wait on me" },
      { id: "B", label: "The important ones, plus a lot of small ones" },
      { id: "C", label: "Mostly money and real exceptions" },
      { id: "D", label: "Rarely — the team has the rules" },
    ],
  },
  {
    id: "knowledge",
    prompt: 'If your laptop and inbox disappeared tomorrow, where does "how we do this" live?',
    weights: { documentation: 2, tools: 1 },
    options: [
      { id: "A", label: "In my head and chat history" },
      { id: "B", label: "Scattered across Slack, docs, and memory" },
      { id: "C", label: "In a shared place people know to open" },
      { id: "D", label: "In a system the team already uses" },
    ],
  },
  {
    id: "ramp",
    prompt: "How soon can a competent new person run a core process without you beside them?",
    weights: { coverage: 2, owner: 1 },
    options: [
      { id: "A", label: "They need weeks beside me" },
      { id: "B", label: "Several days of questions" },
      { id: "C", label: "About a day with the docs" },
      { id: "D", label: "They can start from the SOP the same day" },
    ],
  },
  {
    id: "updates",
    prompt: "When a process changes, what happens to the write-up?",
    weights: { maintenance: 3, maps: 1 },
    options: [
      { id: "A", label: "There isn't one to update" },
      { id: "B", label: "Someone means to update it later" },
      { id: "C", label: "The owner of that process updates the SOP" },
      { id: "D", label: "The SOP and the map are part of the change" },
    ],
  },
];

const ADDONS: Record<Goal, Question[]> = {
  exit: [
    {
      id: "exit-show",
      prompt: "If a buyer asked how this runs without you, what could you show them this week?",
      weights: { documentation: 2, owner: 1 },
      options: [
        { id: "A", label: "Mostly me explaining it" },
        { id: "B", label: "A few SOPs and a lot of stories" },
        { id: "C", label: "Docs for the core, gaps on the edges" },
        { id: "D", label: "A pack they could read without me in the room" },
      ],
    },
    {
      id: "exit-relationships",
      prompt: "How concentrated are customer and vendor relationships in one person, including you?",
      weights: { coverage: 2, owner: 2 },
      options: [
        { id: "A", label: "One person holds the relationships" },
        { id: "B", label: "A couple of people, poorly written down" },
        { id: "C", label: "Shared across the team, with some notes" },
        { id: "D", label: "The team can run them from the record" },
      ],
    },
  ],
  family: [
    {
      id: "family-afternoon",
      prompt: "If you blocked two afternoons this week for family, what would slip?",
      weights: { coverage: 2, owner: 2 },
      options: [
        { id: "A", label: "Real work would wait on me" },
        { id: "B", label: "Someone would guess, and I'd clean it up" },
        { id: "C", label: "A few things would ping me; the rest would move" },
        { id: "D", label: "The week would run from the SOPs" },
      ],
    },
    {
      id: "family-pull",
      prompt: "When you are with your family, how often does the business pull you back in?",
      weights: { owner: 3 },
      options: [
        { id: "A", label: "Most evenings or weekends" },
        { id: "B", label: "Several times a week" },
        { id: "C", label: "Only the occasional real exception" },
        { id: "D", label: "Rarely — the team has the playbook" },
      ],
    },
  ],
  absentee: [
    {
      id: "absentee-away",
      prompt: "If you left for 10 business days and took no calls, what would happen?",
      weights: { coverage: 3, owner: 1 },
      options: [
        { id: "A", label: "Work would stall within a couple of days" },
        { id: "B", label: "It would limp, with a pile waiting" },
        { id: "C", label: "Core work would continue; edge cases would wait" },
        { id: "D", label: "That stretch would close without me" },
      ],
    },
    {
      id: "absentee-backup",
      prompt: "Who can approve the usual exceptions while you are gone?",
      weights: { coverage: 2, documentation: 1 },
      options: [
        { id: "A", label: "Nobody — they wait" },
        { id: "B", label: "Someone improvises" },
        { id: "C", label: "A named backup, with loose rules" },
        { id: "D", label: "A named backup with written limits" },
      ],
    },
  ],
  chaos: [
    {
      id: "chaos-monday",
      prompt: 'On a normal Monday, how do people know what "done right" looks like?',
      weights: { documentation: 2, tools: 2 },
      options: [
        { id: "A", label: "They ask, or they guess" },
        { id: "B", label: "Last week's Slack and memory" },
        { id: "C", label: "A checklist for the busy jobs" },
        { id: "D", label: "A current SOP they actually open" },
      ],
    },
    {
      id: "chaos-wrong",
      prompt: "When something goes wrong, how do you find what was supposed to happen?",
      weights: { maps: 2, maintenance: 1 },
      options: [
        { id: "A", label: "We ask whoever did it" },
        { id: "B", label: "We scroll chat until it turns up" },
        { id: "C", label: "There is a checklist we can replay" },
        { id: "D", label: "The SOP and map show the intended path" },
      ],
    },
  ],
};

/** Goal + 8 core + 2 goal-specific add-ons. */
export const QUIZ_LENGTH = 11;

export function questionsFor(goal: Goal | null): Question[] {
  return [GOAL_QUESTION, ...CORE, ...(goal ? ADDONS[goal] : [])];
}

export function goalFromChoice(choice: Choice): Goal {
  const match = GOAL_QUESTION.options.find((option) => option.id === choice);
  if (!match?.goal) throw new Error(`No goal for choice ${choice}`);
  return match.goal;
}

export function choiceForGoal(goal: Goal): Choice {
  const match = GOAL_QUESTION.options.find((option) => option.goal === goal);
  if (!match) throw new Error(`No choice for goal ${goal}`);
  return match.id;
}
