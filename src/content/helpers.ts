import type { ContentItem, Question, QuestionOption } from "@/lib/generator/types";

export function o(
  id: string,
  label: string,
  tags: string[],
  extra: Partial<QuestionOption> = {},
): QuestionOption {
  return { id, label, tags, ...extra };
}

export function s(
  id: string,
  prompt: string,
  options: QuestionOption[],
  extra: Partial<Question> = {},
): Question {
  return { id, prompt, type: "single", options, priority: 1, ...extra };
}

export function m(
  id: string,
  prompt: string,
  options: QuestionOption[],
  min: number,
  max: number,
  extra: Partial<Question> = {},
): Question {
  return { id, prompt, type: "multi", options, min, max, priority: 1, ...extra };
}

export function c(id: string, text: string, tags: string[], weight = 1): ContentItem {
  return { id, text, tags, weight };
}
