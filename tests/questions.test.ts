import { describe, expect, it } from "vitest";
import { CATEGORY_CONTENT, CATEGORY_LIST, getTool } from "@/content";
import { resolveQuestions, answerLabels, combinationSpace } from "@/lib/generator/questions";
import { validateAnswers } from "@/lib/generator/validators";
import { CATEGORY_IDS, type CategoryId } from "@/lib/generator/types";

describe("question flow", () => {
  it("registers all nine categories", () => {
    expect(CATEGORY_LIST).toHaveLength(9);
    expect([...CATEGORY_IDS].sort()).toEqual(CATEGORY_LIST.map((category) => category.id).sort());
  });

  it.each(CATEGORY_IDS)("keeps %s flows between 8 and 18 questions", (category) => {
    for (let index = 0; index < 25; index += 1) {
      const questions = resolveQuestions(category, {}, undefined, `seed-${index}`);
      expect(questions.length).toBeGreaterThanOrEqual(8);
      expect(questions.length).toBeLessThanOrEqual(18);
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    }
  });

  it.each(CATEGORY_IDS)("has at least 10 questions and 5 options per question in %s", (category) => {
    const content = CATEGORY_CONTENT[category];
    expect(content.questions.length).toBeGreaterThanOrEqual(10);
    for (const question of content.questions) {
      // Base questions are rich (5–12 options); conditional follow-ups can be
      // narrower because they only appear after a specific choice.
      expect(question.options.length).toBeGreaterThanOrEqual(question.followUpOnly ? 3 : 5);
      expect(question.options.length).toBeLessThanOrEqual(12);
      expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length);
    }
  });

  it("randomises order across sessions", () => {
    const first = resolveQuestions("games", {}, undefined, "a").map((q) => q.id).join(",");
    const second = resolveQuestions("games", {}, undefined, "b").map((q) => q.id).join(",");
    expect(first).not.toBe(second);
  });

  it("surfaces conditional follow-ups only after the triggering answer", () => {
    let checked = 0;
    for (const category of CATEGORY_IDS) {
      const content = CATEGORY_CONTENT[category];
      for (const question of content.questions) {
        const option = question.options.find((entry) => (entry.followUps ?? []).length > 0);
        if (!option) continue;
        const followUpId = option.followUps![0];
        const before = resolveQuestions(category, {}, undefined, "conditional").map((q) => q.id);
        const after = resolveQuestions(category, { [question.id]: option.id }, undefined, "conditional").map((q) => q.id);
        expect(before).not.toContain(followUpId);
        expect(after).toContain(followUpId);
        checked += 1;
        break;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("rejects unknown options and multi-select overflow", () => {
    const questions = resolveQuestions("games", {}, undefined, "validation");
    const single = questions.find((q) => q.type === "single")!;
    const unknown = validateAnswers(questions, { [single.id]: "does_not_exist" });
    expect(unknown.ok).toBe(false);

    const multi = questions.find((q) => q.type === "multi");
    if (multi) {
      const ids = multi.options.slice(0, (multi.max ?? multi.options.length) + 1).map((option) => option.id);
      const result = validateAnswers(questions, { [multi.id]: ids });
      expect(result.ok).toBe(false);
    }
  });

  it("resolves tool-specific flows", () => {
    for (const category of CATEGORY_IDS) {
      const tool = CATEGORY_CONTENT[category].tools[0];
      const questions = resolveQuestions(category, {}, tool.id, "tool");
      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const extra of tool.extraQuestions ?? []) {
        expect(questions.some((question) => question.id === extra.id)).toBe(true);
      }
    }
  });

  it("returns readable answer labels", () => {
    const question = CATEGORY_CONTENT.games.questions.find((q) => q.type === "single")!;
    const labels = answerLabels("games", { [question.id]: question.options[0].id });
    expect(labels[question.id]).toEqual([question.options[0].label]);
  });

  it("computes a positive combination space for every category", () => {
    for (const category of CATEGORY_IDS) {
      expect(combinationSpace(category)).toBeGreaterThan(1000);
    }
  });

  it("exposes the expected tool catalogue", () => {
    const expected: Record<CategoryId, number> = {
      games: 11,
      business: 10,
      apps: 8,
      creator: 8,
      study: 7,
      career: 6,
      coding: 8,
      creative: 6,
      ideas: 6,
    };
    for (const category of CATEGORY_IDS) {
      expect(CATEGORY_CONTENT[category].tools.length).toBeGreaterThanOrEqual(expected[category]);
      for (const tool of CATEGORY_CONTENT[category].tools) {
        expect(tool.pass).toBe(`${category}_pass`);
        expect(getTool(category, tool.id)?.id).toBe(tool.id);
      }
    }
  });
});
