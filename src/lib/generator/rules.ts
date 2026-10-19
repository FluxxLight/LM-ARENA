import type { AnswerMap, ContentItem, Question, Rule } from "./types";

export interface RuleEffect {
  boost: Record<string, number>;
  forbid: Set<string>;
  fired: string[];
}

/**
 * Turns raw answers into a list of active tags and then applies the rule sheet.
 * Rules are additive and deterministic: answers -> tags -> boosts/forbids.
 */
export function collectTags(
  answers: AnswerMap,
  questions: Question[],
  extraTags: string[] = [],
): string[] {
  const tags = new Set<string>(extraTags);
  for (const question of questions) {
    const value = answers[question.id];
    if (!value) continue;
    const ids = Array.isArray(value) ? value : [value];
    for (const id of ids) {
      const option = question.options.find((o) => o.id === id);
      if (!option) continue;
      for (const tag of option.tags ?? []) tags.add(tag);
    }
  }
  return [...tags];
}

export function applyRules(tags: string[], rules: Rule[]): RuleEffect {
  const tagSet = new Set(tags);
  const boost: Record<string, number> = {};
  const forbid = new Set<string>();
  const fired: string[] = [];

  for (const rule of rules) {
    if (!rule.when.every((tag) => tagSet.has(tag))) continue;
    fired.push(rule.id);
    for (const [tag, amount] of Object.entries(rule.boost ?? {})) {
      boost[tag] = (boost[tag] ?? 0) + amount;
    }
    for (const tag of rule.forbid ?? []) forbid.add(tag);
  }

  return { boost, forbid, fired };
}

/**
 * Scores a content item against the answer tags. Base affinity = number of
 * shared tags, amplified by rule boosts. Items carrying a forbidden tag are
 * rejected (hard constraint), which is what prevents nonsense combos.
 */
export function scoreContent(
  item: ContentItem,
  tags: Set<string>,
  effect: RuleEffect,
  focusTags: string[] = [],
): number | null {
  if (item.tags.some((tag) => effect.forbid.has(tag))) return null;

  let score = item.weight ?? 1;
  let matches = 0;
  for (const tag of item.tags) {
    if (tags.has(tag)) matches += 1;
    if (effect.boost[tag]) score += effect.boost[tag];
    if (focusTags.includes(tag)) score += 2.5;
  }
  // Strongly favour affinity, but keep a floor so every pool stays usable.
  score += matches * 4;
  return Math.max(0.35, score);
}

export function forbidList(effect: RuleEffect): string[] {
  return [...effect.forbid];
}
