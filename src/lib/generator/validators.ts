import type { AnswerMap, GeneratedProject, Question } from "./types";

export class GenerationError extends Error {
  code: "INVALID_ANSWERS" | "NO_CONTENT" | "UNSAFE_RESULT";
  constructor(code: GenerationError["code"], message: string) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
  }
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const MIN_TEXT = 3;
const MAX_TEXT = 1200;

export function validateAnswers(questions: Question[], answers: AnswerMap): ValidationResult {
  const errors: string[] = [];
  const known = new Set(questions.map((q) => q.id));
  for (const key of Object.keys(answers)) {
    if (!known.has(key)) errors.push(`Resposta desconhecida: ${key}`);
  }
  for (const question of questions) {
    const value = answers[question.id];
    if (value === undefined) continue;
    const ids = Array.isArray(value) ? value : [value];
    if (question.type === "single" && ids.length > 1) {
      errors.push(`Pergunta ${question.id} aceita apenas uma resposta.`);
    }
    if (question.type === "multi") {
      const min = question.min ?? 1;
      const max = question.max ?? question.options.length;
      if (ids.length < min) errors.push(`Selecione ao menos ${min} em ${question.id}.`);
      if (ids.length > max) errors.push(`Selecione no máximo ${max} em ${question.id}.`);
    }
    for (const id of ids) {
      const option = question.options.find((o) => o.id === id);
      if (!option) errors.push(`Opção inválida em ${question.id}: ${id}`);
      for (const conflict of option?.conflicts ?? []) {
        if (ids.includes(conflict)) errors.push(`Opções incompatíveis em ${question.id}.`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function isCleanText(text: string): boolean {
  if (text.length < MIN_TEXT || text.length > MAX_TEXT) return false;
  if (/[{}<>]|\bundefined\b|\bnull\b|\bNaN\b/i.test(text)) return false;
  if (/\s{3,}/.test(text)) return false;
  return true;
}

export function validateProject(project: GeneratedProject): ValidationResult {
  const errors: string[] = [];
  // Strip design tokens used by the codebase from the final quality check.
  const safe = (text: string) => !/[{}]|\bundefined\b|\bnull\b|\bNaN\b/i.test(text);

  if (!project.name || project.name.length < 2) errors.push("Nome ausente.");
  for (const [key, value] of Object.entries({
    tagline: project.tagline,
    summary: project.summary,
    concept: project.concept,
    audience: project.audience,
    coreMechanic: project.coreMechanic,
    progression: project.progression,
    monetization: project.monetization,
  })) {
    if (!isCleanText(value) || !safe(value)) errors.push(`Seção inválida: ${key}`);
  }
  if (project.features.length < 3) errors.push("Poucas características.");
  if (project.roadmap.length < 4) errors.push("Roadmap incompleto.");
  if (project.highlights.length < 2) errors.push("Poucos destaques.");
  if (project.nextSteps.length < 2) errors.push("Próximos passos incompletos.");
  for (const item of [...project.features, ...project.highlights, ...project.risks, ...project.nextSteps]) {
    if (!isCleanText(item) || !safe(item)) errors.push(`Item inválido: ${item.slice(0, 40)}`);
  }
  const featureSet = new Set(project.features.map((f) => f.toLowerCase()));
  if (featureSet.size !== project.features.length) errors.push("Características duplicadas.");
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

/** Soft quality gate used by the variety test. */
export function isAcceptableVariety(projects: GeneratedProject[]): boolean {
  if (projects.length < 2) return true;
  const names = new Set(projects.map((p) => p.name));
  const fingerprints = new Set(projects.map((p) => p.fingerprint));
  return names.size / projects.length > 0.35 && fingerprints.size / projects.length > 0.9;
}
