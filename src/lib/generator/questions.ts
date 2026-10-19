import { CATEGORY_CONTENT, getCategoryContent, getTool } from "@/content";
import type {
  AnswerMap,
  CategoryId,
  FlowQuestion,
  Question,
  ToolId,
} from "./types";
import { createRng } from "./randomizer";
import { validateAnswers } from "./validators";

function selectedIds(answers: AnswerMap, question: Question): string[] {
  const value = answers[question.id];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function tagsFromAnswers(answers: AnswerMap, questions: Question[]): Set<string> {
  const tags = new Set<string>();
  for (const question of questions) {
    for (const id of selectedIds(answers, question)) {
      const option = question.options.find((o) => o.id === id);
      option?.tags?.forEach((tag) => tags.add(tag));
    }
  }
  return tags;
}

/**
 * Resolves the adaptive question flow.
 *
 * - Tool-specific questions are merged in.
 * - Follow-up questions only appear when a parent option requests them.
 * - `requires` / `excludes` depend on tags produced by previous answers, so the
 *   flow genuinely changes shape instead of only reordering a fixed list.
 * - The non-core block is deterministically shuffled per session, which avoids
 *   the "always the same ten questions in the same order" feeling.
 */
export function resolveQuestions(
  category: CategoryId,
  answers: AnswerMap,
  toolId?: ToolId,
  sessionSeed = "default",
): Question[] {
  const categoryContent = getCategoryContent(category);
  const tool = toolId ? getTool(category, toolId) : null;
  const rng = createRng(`${category}:${toolId ?? "project"}:${sessionSeed}:flow`);

  const base = categoryContent.questions.filter((q) => !q.followUpOnly);
  const conditional = categoryContent.questions.filter((q) => q.followUpOnly);
  const all = [...base, ...conditional, ...(tool?.extraQuestions ?? [])];

  // Build the set of follow-ups requested by current answers (transitively).
  const activeFollowUps = new Set<string>();
  let changed = true;
  let guard = 0;
  while (changed && guard < 6) {
    changed = false;
    guard++;
    for (const question of all) {
      if (!activeFollowUps.has(question.id) && question.followUpOnly && !isReferenced(question.id, answers, all)) {
        continue;
      }
      for (const id of selectedIds(answers, question)) {
        const option = question.options.find((o) => o.id === id);
        for (const followUp of option?.followUps ?? []) {
          if (!activeFollowUps.has(followUp)) {
            activeFollowUps.add(followUp);
            changed = true;
          }
        }
      }
    }
  }

  const tagSet = tagsFromAnswers(answers, all);

  const eligible = all.filter((question) => {
    if (tool?.questionIds && !question.followUpOnly) {
      const toolOwned = (tool.extraQuestions ?? []).some((q) => q.id === question.id);
      if (!toolOwned && !tool.questionIds!.includes(question.id)) return false;
    }
    if (question.tools && toolId && !question.tools.includes(toolId)) return false;
    if (question.followUpOnly) {
      if (!activeFollowUps.has(question.id) && !isReferenced(question.id, answers, all)) return false;
    }
    if (question.requires && !question.requires.every((tag) => tagSet.has(tag))) return false;
    if (question.excludes && question.excludes.some((tag) => tagSet.has(tag))) return false;
    return true;
  });

  const core = eligible.filter((q) => (q.priority ?? 1) === 0);
  const followUps = eligible.filter((q) => q.followUpOnly);
  const toolQuestions = (tool?.extraQuestions ?? []).filter((q) =>
    eligible.some((entry) => entry.id === q.id),
  );
  const candidates = eligible.filter(
    (q) => (q.priority ?? 1) !== 0 && !q.followUpOnly && !toolQuestions.some((t) => t.id === q.id),
  );

  // Adaptive length: 8–18 questions, seeded per session so the same visitor
  // sees a stable conversation while different sessions get different lengths.
  const targetBase = Math.min(14, Math.max(8, core.length + 4 + rng.int(4)));
  const room = Math.max(0, targetBase - core.length - toolQuestions.length);
  const picked = rng.shuffle(candidates).slice(0, room);

  const seenIds = new Set<string>();
  const parentsFirst = [...core, ...toolQuestions, ...picked];
  const trailing = [...followUps].sort((a, b) => {
    const aParentKnown = isReferenced(a.id, answers, all) ? 0 : 1;
    const bParentKnown = isReferenced(b.id, answers, all) ? 0 : 1;
    return aParentKnown - bParentKnown;
  });
  const ordered = [...parentsFirst, ...trailing].filter((question) => {
    if (seenIds.has(question.id)) return false;
    seenIds.add(question.id);
    return true;
  });

  const deduped: Question[] = [];
  const seen = new Set<string>();
  for (const question of ordered) {
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    deduped.push(question);
  }
  return deduped;
}

function isReferenced(questionId: string, answers: AnswerMap, questions: Question[]): boolean {
  for (const question of questions) {
    for (const id of selectedIds(answers, question)) {
      const option = question.options.find((o) => o.id === id);
      if (option?.followUps?.includes(questionId)) return true;
    }
  }
  return false;
}

export function flowFor(
  category: CategoryId,
  answers: AnswerMap,
  toolId?: ToolId,
  sessionSeed?: string,
): FlowQuestion[] {
  const questions = resolveQuestions(category, answers, toolId, sessionSeed);
  return questions.map((question, index) => ({ ...question, index, total: questions.length }));
}

export function validateFlow(
  category: CategoryId,
  answers: AnswerMap,
  toolId?: ToolId,
  sessionSeed?: string,
) {
  const questions = resolveQuestions(category, answers, toolId, sessionSeed);
  return { questions, ...validateAnswers(questions, answers) };
}

export function answerLabels(
  category: CategoryId,
  answers: AnswerMap,
  toolId?: ToolId,
  sessionSeed?: string,
): Record<string, string[]> {
  const questions = resolveQuestions(category, answers, toolId, sessionSeed);
  const out: Record<string, string[]> = {};
  for (const question of questions) {
    const ids = selectedIds(answers, question);
    if (!ids.length) continue;
    out[question.id] = ids
      .map((id) => question.options.find((o) => o.id === id)?.label)
      .filter((label): label is string => Boolean(label));
  }
  return out;
}

export function allQuestions(category: CategoryId): Question[] {
  return CATEGORY_CONTENT[category].questions;
}

/**
 * Rough size of the combinatorial space, used in result metadata.
 * It is computed from actual option counts, never invented.
 */
export function combinationSpace(category: CategoryId): number {
  const content = getCategoryContent(category);
  return content.questions.reduce((acc, question) => {
    const options = Math.max(1, question.options.length);
    const pick = question.type === "multi" ? (question.max ?? options) : 1;
    return acc * Math.min(options ** pick, 1_000_000);
  }, 1);
}
