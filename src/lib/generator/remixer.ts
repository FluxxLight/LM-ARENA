import type {
  AnswerMap,
  GeneratedProject,
  Question,
  RemixMode,
  RemixOptions,
} from "./types";
import { createRng, createSeed, type Rng } from "./randomizer";
import { resolveQuestions } from "./questions";
import { generateProject } from "./engine";
import { REMIX_MODE_LIST } from "@/config/remix";

const MODE_CONFIG: Record<RemixMode, { keep: string[]; mutate: number; label: string }> = {
  light: {
    keep: ["genre", "platform", "style", "audience", "type", "niche"],
    mutate: 0.35,
    label: "Remix leve",
  },
  full: { keep: ["genre"], mutate: 0.7, label: "Remix completo" },
  random: { keep: [], mutate: 1, label: "Remix aleatório" },
  professional: {
    keep: ["genre", "platform", "audience", "objective", "type", "niche", "subject"],
    mutate: 0.4,
    label: "Remix profissional",
  },
};

function randomOptionIds(rng: Rng, question: Question, exclude: string[] = []): string | string[] {
  const pool = question.options.filter((option) => !exclude.includes(option.id));
  if (!pool.length) return question.options[0]?.id ?? "";
  if (question.type === "single") {
    return rng.pick(pool).id;
  }
  const max = Math.min(question.max ?? 3, pool.length);
  const min = Math.min(question.min ?? 1, max);
  const count = min + rng.int(max - min + 1);
  const shuffled = rng.shuffle(pool).slice(0, count);
  const chosen: string[] = [];
  for (const option of shuffled) {
    if (chosen.some((id) => option.conflicts?.includes(id))) continue;
    chosen.push(option.id);
  }
  return chosen.length ? chosen : [shuffled[0].id];
}

function mutateAnswers(
  rng: Rng,
  questions: Question[],
  original: AnswerMap,
  mode: RemixMode,
): { answers: AnswerMap; changed: string[] } {
  const config = MODE_CONFIG[mode];
  const answers: AnswerMap = { ...original };
  const changed: string[] = [];
  const mutable = questions.filter((q) => !config.keep.includes(q.id));

  for (const question of mutable) {
    const current = answers[question.id];
    const shouldMutate = mode === "random" ? true : rng.chance(config.mutate);
    if (!shouldMutate) continue;
    const currentIds = current ? (Array.isArray(current) ? current : [current]) : [];
    const next = randomOptionIds(
      rng,
      question,
      mode === "professional" ? [] : currentIds,
    );
    const nextIds = Array.isArray(next) ? next : [next];
    if (nextIds.join(",") === currentIds.join(",")) continue;
    answers[question.id] = next;
    changed.push(question.id);
  }
  // A remix must always produce a different answer profile, otherwise the
  // "remix" would silently return the same project.
  if (!changed.length) {
    const fallback = mutable[0] ?? questions[0];
    if (fallback) {
      const current = answers[fallback.id];
      const currentIds = current ? (Array.isArray(current) ? current : [current]) : [];
      answers[fallback.id] = randomOptionIds(rng, fallback, currentIds);
      changed.push(fallback.id);
    }
  }
  return { answers, changed };
}

export interface RemixResult {
  project: GeneratedProject;
  mode: RemixMode;
  modeLabel: string;
  changedQuestions: string[];
}

/**
 * Remix keeps the selected category (and therefore the pass the user owns) but
 * recombines answers and content. Each mode has a different appetite for
 * change; "random" deliberately ignores the previous answers.
 */
export function remixProject(
  original: GeneratedProject,
  options: RemixOptions,
): RemixResult {
  const mode = options.mode;
  const seed = options.seed ?? createSeed();
  const rng = createRng(`${original.fingerprint}:${seed}:${mode}`);
  const questions = resolveQuestions(original.category, original.answers, original.tool, seed);
  const { answers, changed } = mutateAnswers(rng, questions, original.answers, mode);

  const project = generateProject(
    {
      category: original.category,
      tool: original.tool,
      answers,
      seed,
      sessionSeed: seed,
    },
    {
      avoidNames: [...(options.avoidNames ?? []), original.name],
      existingFingerprints: [...(options.existingFingerprints ?? []), original.fingerprint],
    },
  );

  if (mode === "professional") {
    project.highlights = [
      "Posicionamento pronto para uma conversa de investidor ou cliente.",
      ...project.highlights.slice(0, 2),
    ].slice(0, 3);
    project.extras = [
      ...project.extras,
      {
        title: "Camada profissional",
        items: [
          "Métrica principal: uma taxa de retenção ou conversão observável em 30 dias.",
          "Público inicial: um segmento estreito que sente o problema toda semana.",
          "Oferta: um resultado concreto, com escopo e prazo declarados.",
          "Risco: validar disposição de pagamento antes de ampliar o produto.",
        ],
      },
    ];
  }

  return {
    project,
    mode,
    modeLabel: MODE_CONFIG[mode].label,
    changedQuestions: changed,
  };
}

export const REMIX_MODES = REMIX_MODE_LIST;

export function remixFromData(
  original: GeneratedProject,
  mode: RemixMode,
  seed?: string,
): RemixResult {
  if (!MODE_CONFIG[mode]) throw new Error("Modo de remix inválido.");
  return remixProject(original, { mode, seed });
}
