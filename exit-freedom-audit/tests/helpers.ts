import { questionsFor, type Choice, type Goal } from "@/lib/questions";
import { scoreQuiz, type Answers } from "@/lib/score";

export function fillScore(goal: Goal, choice: Choice) {
  const answers: Answers = {};
  for (const question of questionsFor(goal)) {
    if (!question.weights) continue;
    answers[question.id] = choice;
  }
  return scoreQuiz(goal, answers);
}
