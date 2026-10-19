import { describe, expect, it } from "vitest";
import { validateAnswers, validateProject, isAcceptableVariety } from "@/lib/generator/validators";
import { generateProject } from "@/lib/generator/engine";
import { CATEGORY_CONTENT } from "@/content";
import type { Question } from "@/lib/generator/types";

const conflictQuestion: Question = {
  id: "mode",
  prompt: "Modo?",
  type: "multi",
  min: 1,
  max: 3,
  options: [
    { id: "solo", label: "Solo", conflicts: ["coop"] },
    { id: "coop", label: "Coop", conflicts: ["solo"] },
    { id: "pvp", label: "PvP" },
  ],
};

describe("validators", () => {
  it("detects incompatible options", () => {
    const result = validateAnswers([conflictQuestion], { mode: ["solo", "coop"] });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("incompatíveis");
  });

  it("enforces min and max for multi-select", () => {
    expect(validateAnswers([conflictQuestion], { mode: [] }).ok).toBe(false);
    expect(validateAnswers([conflictQuestion], { mode: ["solo", "pvp"] }).ok).toBe(true);
  });

  it("rejects answers outside the active flow", () => {
    const result = validateAnswers([conflictQuestion], { mode: "solo", ghost: "x" });
    expect(result.ok).toBe(false);
  });

  it("flags duplicated features in a project", () => {
    const project = generateProject({ category: "games", answers: {}, seed: "dup" });
    project.features = [project.features[0], project.features[0], project.features[1]];
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("duplicadas");
  });

  it("accepts a healthy variety sample", () => {
    const projects = Array.from({ length: 8 }, (_, index) =>
      generateProject({ category: "coding", answers: {}, seed: `variety-${index}` }),
    );
    expect(isAcceptableVariety(projects)).toBe(true);
  });

  it("has at least one conflict declaration across the content banks", () => {
    const questions = CATEGORY_CONTENT.games.questions;
    const hasConflicts = questions.some((question) =>
      question.options.some((option) => (option.conflicts ?? []).length > 0),
    );
    expect(hasConflicts).toBe(true);
  });
});
