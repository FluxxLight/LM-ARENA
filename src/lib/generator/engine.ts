import { getCategoryContent, getTool } from "@/content";
import { createSeed } from "./randomizer";
import { resolveQuestions, answerLabels } from "./questions";
import { composeProject, sectionLabelsFor } from "./combiner";
import { validateAnswers, validateProject, GenerationError } from "./validators";
import type { GeneratedProject, GenerationRequest } from "./types";

export interface EngineOptions {
  avoidNames?: string[];
  existingFingerprints?: string[];
  createdAt?: string;
}

/**
 * generateProject — the deterministic core of IDEAForge.
 *
 * There is no AI here: the project is assembled from the answer profile, the
 * category content bank, weighted rules, sentence templates and a seeded RNG.
 * Same answers + same seed = same project, which makes results reproducible
 * and shareable.
 */
export function generateProject(
  request: GenerationRequest,
  options: EngineOptions = {},
): GeneratedProject {
  const category = getCategoryContent(request.category);
  const isDefaultTool =
    !request.tool || request.tool === `${request.category}_project` || request.tool === `${request.category}_concept`;
  const tool = isDefaultTool ? null : getTool(request.category, request.tool);
  if (!isDefaultTool && !tool) throw new GenerationError("INVALID_ANSWERS", "Ferramenta desconhecida.");
  if (request.category === "ideas" && !tool) {
    // Ideas always runs through a tool (expand/remix/combine/convert).
  }

  const sessionSeed = request.sessionSeed ?? request.seed ?? "session";
  const questions = resolveQuestions(request.category, request.answers, tool?.id, sessionSeed);
  // Answers for questions that are not part of this flow (for example after a
  // tool switch) are harmless, but they must not leak into the result.
  const allowed = new Set(questions.map((q) => q.id));
  const answers = Object.fromEntries(
    Object.entries(request.answers).filter(([key]) => allowed.has(key)),
  );
  const validation = validateAnswers(questions, answers);
  if (!validation.ok) {
    throw new GenerationError("INVALID_ANSWERS", validation.errors.join(" "));
  }

  const seed = request.seed ?? createSeed();
  const labels = sectionLabelsFor(category, tool?.sectionLabels);
  const avoidNames = new Set((options.avoidNames ?? []).map((name) => name.toLowerCase()));

  const project = composeProject({
    seed,
    content: category,
    toolId: tool?.id ?? `${request.category}_project`,
    toolLabel: tool?.label ?? category.label,
    toolKind: tool?.kind,
    labels,
    questions,
    answers,
    rules: category.rules ?? [],
    focusTags: tool?.focusTags ?? [],
    avoidNames,
    existingFingerprints: options.existingFingerprints,
    createdAt: options.createdAt,
  });

  project.answerLabels = answerLabels(request.category, answers, tool?.id, sessionSeed);

  const check = validateProject(project);
  if (!check.ok) {
    throw new GenerationError("UNSAFE_RESULT", check.errors.join(" "));
  }
  return project;
}

export function previewQuestionCount(categoryId: GenerationRequest["category"], answers: GenerationRequest["answers"], tool?: string): number {
  return resolveQuestions(categoryId, answers, tool).length;
}
