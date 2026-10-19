import { describe, expect, it } from "vitest";
import { CATEGORY_CONTENT } from "@/content";
import { generateProject } from "@/lib/generator/engine";
import { resolveQuestions } from "@/lib/generator/questions";
import { remixProject, REMIX_MODES } from "@/lib/generator/remixer";
import { validateProject, GenerationError } from "@/lib/generator/validators";
import { CATEGORY_IDS, type AnswerMap, type CategoryId } from "@/lib/generator/types";

function answersFor(category: CategoryId, seed: string): AnswerMap {
  const questions = resolveQuestions(category, {}, undefined, seed);
  const answers: AnswerMap = {};
  questions.forEach((question, index) => {
    const picks = question.type === "single" ? 1 : Math.min(question.max ?? 3, Math.max(question.min ?? 2, 2));
    answers[question.id] = question.options.slice(0, picks).map((option) => option.id);
    if (question.type === "single") answers[question.id] = question.options[index % question.options.length].id;
  });
  return answers;
}

describe("engine", () => {
  it.each(CATEGORY_IDS)("generates a valid project for %s without answers", (category) => {
    const project = generateProject(
      { category, answers: {}, seed: `empty-${category}` },
      { createdAt: "2026-01-01T00:00:00.000Z" },
    );
    expect(validateProject(project).ok).toBe(true);
    expect(project.category).toBe(category);
    expect(project.meta.engine).toBe("deterministic-v1");
  });

  it.each(CATEGORY_IDS)("generates a valid project for %s with full answers", (category) => {
    const seed = `full-${category}`;
    const project = generateProject(
      { category, answers: answersFor(category, seed), seed, sessionSeed: seed },
      { createdAt: "2026-01-01T00:00:00.000Z" },
    );
    expect(validateProject(project).ok).toBe(true);
    expect(project.roadmap.length).toBeGreaterThanOrEqual(4);
    expect(project.features.length).toBeGreaterThanOrEqual(3);
    expect(project.nextSteps.length).toBeGreaterThanOrEqual(2);
    expect(project.summary.length).toBeGreaterThan(20);
  });

  it("is fully deterministic for the same seed and answers", () => {
    const options = { createdAt: "2026-01-01T00:00:00.000Z" };
    const first = generateProject({ category: "games", answers: {}, seed: "deterministic" }, options);
    const second = generateProject({ category: "games", answers: {}, seed: "deterministic" }, options);
    expect(second).toEqual(first);
  });

  it("changes the result when the seed changes", () => {
    const options = { createdAt: "2026-01-01T00:00:00.000Z" };
    const first = generateProject({ category: "business", answers: {}, seed: "seed-one" }, options);
    const second = generateProject({ category: "business", answers: {}, seed: "seed-two" }, options);
    expect(second.fingerprint).not.toBe(first.fingerprint);
  });

  it("ignores answers that are not part of the active flow", () => {
    const project = generateProject(
      { category: "apps", answers: { invented_question: "nope" }, seed: "filter" },
      { createdAt: "2026-01-01T00:00:00.000Z" },
    );
    expect(project.answers.invented_question).toBeUndefined();
  });

  it("rejects unknown tools", () => {
    expect(() => generateProject({ category: "games", tool: "nope", answers: {}, seed: "x" })).toThrow(GenerationError);
  });

  it("supports every tool in every category", () => {
    for (const category of CATEGORY_IDS) {
      for (const tool of CATEGORY_CONTENT[category].tools) {
        const project = generateProject(
          { category, tool: tool.id, answers: {}, seed: `tool-${category}-${tool.id}` },
          { createdAt: "2026-01-01T00:00:00.000Z" },
        );
        expect(validateProject(project).ok).toBe(true);
        expect(project.toolLabel).toBe(tool.label);
        expect(project.tool).toBe(tool.id);
      }
    }
  });

  it("honours avoidNames when the same request is repeated", () => {
    const base = generateProject(
      { category: "creator", answers: {}, seed: "repeat" },
      { createdAt: "2026-01-01T00:00:00.000Z" },
    );
    const next = generateProject(
      { category: "creator", answers: {}, seed: "repeat" },
      { createdAt: "2026-01-01T00:00:00.000Z", avoidNames: [base.name] },
    );
    expect(next.name.toLowerCase()).not.toBe(base.name.toLowerCase());
  });

  it("produces all four remix modes", () => {
    const original = generateProject(
      { category: "games", answers: {}, seed: "remix-origin" },
      { createdAt: "2026-01-01T00:00:00.000Z" },
    );
    for (const mode of REMIX_MODES) {
      const result = remixProject(original, { mode: mode.mode, seed: `remix-${mode.mode}` });
      expect(validateProject(result.project).ok).toBe(true);
      expect(result.project.category).toBe(original.category);
      expect(result.modeLabel).toBe(mode.label);
      expect(result.changedQuestions.length).toBeGreaterThan(0);
    }
  });

  it("keeps the business promise honest (no profit guarantees)", () => {
    for (let index = 0; index < 40; index += 1) {
      const project = generateProject(
        { category: "business", answers: {}, seed: `honest-${index}` },
        { createdAt: "2026-01-01T00:00:00.000Z" },
      );
      const text = JSON.stringify(project).toLowerCase();
      expect(text).not.toMatch(/lucro garantido|retorno garantido|ganhe \d|renda garantida/);
    }
  });
});
