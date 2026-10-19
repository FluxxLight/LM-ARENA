import type {
  AnswerMap,
  CategoryContent,
  ContentItem,
  Question,
  Rule,
  SectionLabels,
  GeneratedProject,
  RoadmapPhase,
} from "./types";
import type { Rng } from "./randomizer";
import { createRng, weightedSample } from "./randomizer";
import { applyRules, collectTags, scoreContent } from "./rules";
import { lowerFirst, lowerLabel, pickFrame, joinSentences, SUMMARY_FRAMES, CLOSERS, trimToSentences } from "./templates";

const TOKEN_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export function buildTokens(
  content: CategoryContent,
  questions: Question[],
  answers: AnswerMap,
): Record<string, string> {
  const tokens: Record<string, string> = { ...content.defaults };

  for (const question of questions) {
    const value = answers[question.id];
    if (!value) continue;
    const ids = Array.isArray(value) ? value : [value];
    const labels = ids
      .map((id) => question.options.find((o) => o.id === id)?.label)
      .filter((label): label is string => Boolean(label));
    if (!labels.length) continue;
    const joined = labels.join(", ");
    tokens[question.id] = joined;
    tokens[`${question.id}_lower`] = lowerLabel(joined);
    tokens[`${question.id}_list`] = labels.map(lowerLabel).join(", ");
  }

  // Derived tokens used by templates. These are deterministic and never
  // invented: they come from the selected answers.
  const multiplayer = answers.multiplayer;
  if (typeof multiplayer === "string") {
    tokens.multiplayer_label =
      multiplayer === "none" ? "single-player"
      : multiplayer === "coop" ? "cooperativo"
      : multiplayer === "competitive" ? "competitivo"
      : "cooperativo e competitivo";
  }
  const team = answers.team;
  if (typeof team === "string") {
    tokens.team_label =
      team === "solo" ? "uma pessoa"
      : team === "duo" ? "duas pessoas"
      : team === "small" ? "uma equipe pequena"
      : "um estúdio";
  }
  tokens.category = content.singular;
  tokens.category_plural = content.label;
  tokens.noun = content.noun;
  return tokens;
}

export function fillTokens(text: string, tokens: Record<string, string>): string | null {
  let missing = false;
  const result = text.replace(TOKEN_RE, (_match, key: string) => {
    const value = tokens[key] ?? tokens[key.toLowerCase()];
    if (!value) {
      missing = true;
      return "";
    }
    return value;
  });
  if (missing) return null;
  return result.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}


function pickScored(
  rng: Rng,
  items: ContentItem[],
  tokens: Record<string, string>,
  tags: Set<string>,
  effect: ReturnType<typeof applyRules>,
  focusTags: string[],
  count: number,
): string[] {
  const candidates = items
    .map((item) => {
      const text = fillTokens(item.text, tokens);
      if (text === null) return null;
      const score = scoreContent(item, tags, effect, focusTags);
      if (score === null) return null;
      return { ...item, text, weight: score };
    })
    .filter((item): item is ContentItem & { text: string; weight: number } => Boolean(item));

  const picked = weightedSample(rng, candidates, count);
  return picked.map((item) => item.text);
}

export function composeName(rng: Rng, content: CategoryContent, avoid: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const prefix = rng.pick(content.namePrefixes);
    const suffix = rng.pick(content.nameSuffixes);
    const pattern = rng.pick(content.namePatterns);
    const name = pattern.split("{p}").join(prefix).split("{s}").join(suffix).trim();
    if (!avoid.has(name.toLowerCase())) return name;
  }
  return `${rng.pick(content.namePrefixes)} ${rng.pick(content.nameSuffixes)} ${rng.int(99) + 1}`;
}

export function buildRoadmap(
  rng: Rng,
  content: CategoryContent,
  tokens: Record<string, string>,
  tags: Set<string>,
  effect: ReturnType<typeof applyRules>,
  focusTags: string[],
  teamSize: string,
): RoadmapPhase[] {
  const count = Math.max(4, Math.min(5, content.roadmapTitles.length));
  const titles = content.roadmapTitles.slice(0, count);
  const generic = content.roadmap.filter((item) => !item.tags.some((tag) => tag.startsWith("phase_")));
  const timeframes =
    teamSize === "solo" ? ["1-2 semanas", "2-4 semanas", "3-5 semanas", "2-3 semanas", "1-2 semanas"]
    : teamSize === "duo" ? ["1-2 semanas", "3-5 semanas", "4-6 semanas", "3-4 semanas", "2-3 semanas"]
    : ["1 semana", "2-4 semanas", "4-8 semanas", "3-6 semanas", "2-4 semanas"];

  return titles.map((title, i) => {
    const phasePool = content.roadmap.filter((item) => item.tags.includes(`phase_${i + 1}`));
    const pool = phasePool.length ? phasePool : generic;
    const picked = pickScored(rng, pool, tokens, tags, effect, focusTags, 1)[0];
    return {
      title,
      description: picked ?? "Definir critérios claros de saída para esta etapa.",
      timeframe: timeframes[i] ?? "a definir",
    };
  });
}

export function sectionLabelsFor(
  content: CategoryContent,
  toolLabels?: Partial<SectionLabels>,
): SectionLabels {
  return { ...content.sectionLabels, ...toolLabels };
}

export function fingerprintFor(
  category: string,
  tool: string,
  answers: AnswerMap,
  name: string,
  picked: string[],
): string {
  const answerSignature = Object.entries(answers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? [...value].sort().join(",") : value}`)
    .join("|");
  return `${category}:${tool}:${name}:${answerSignature}:${picked.join("~")}`;
}

export function buildExtras(
  rng: Rng,
  content: CategoryContent,
  toolKind: string | undefined,
  toolId: string,
  tokens: Record<string, string>,
  tags: Set<string>,
  effect: ReturnType<typeof applyRules>,
  focusTags: string[],
): { title: string; items: string[] }[] {
  if (!toolKind || toolKind === "project") return [];
  const load = (slot: keyof CategoryContent) => (content[slot] as ContentItem[] | undefined) ?? [];

  const toolPool = content.toolPools?.[toolId] ?? content.toolPools?.[toolKind ?? ""] ?? [];
  if (toolKind === "character") {
    const chosen = pickScored(rng, toolPool.length ? toolPool : load("mechanics"), tokens, tags, effect, focusTags, 5);
    return [
      { title: "Ficha do personagem", items: chosen.slice(0, 3) },
      { title: "Conflito pessoal", items: chosen.slice(3, 5) },
    ];
  }
  if (toolKind === "world") {
    const chosen = pickScored(rng, toolPool.length ? toolPool : load("features"), tokens, tags, effect, focusTags, 7);
    return [
      { title: "Regiões e marcos", items: chosen.slice(0, 4) },
      { title: "Regras do mundo", items: chosen.slice(4, 7) },
    ];
  }
  if (toolKind === "quest") {
    return [
      { title: "Estrutura da missão", items: toolPool.length ? pickScored(rng, toolPool, tokens, tags, effect, focusTags, 3) : ["Gancho: uma anomalia interrompe o fluxo normal.", "Obstáculo: o caminho óbvio está bloqueado.", "Virada: a recompensa tem um custo escondido."] },
      { title: "Critérios de sucesso", items: pickScored(rng, load("risks"), tokens, tags, effect, focusTags, 2) },
    ];
  }
  if (toolKind === "gdd") {
    return [
      { title: "Pilares de design", items: pickScored(rng, load("highlights"), tokens, tags, effect, focusTags, 3) },
      { title: "Fora de escopo", items: pickScored(rng, load("risks"), tokens, tags, effect, focusTags, 3) },
    ];
  }
  const splitTitles: Record<string, [string, string]> = {
    screens: ["Telas essenciais", "Navegação e estados"],
    database: ["Modelo de dados", "Regras e índices"],
    architecture: ["Decisões de arquitetura", "Operação e segurança"],
    flow: ["Fluxo do usuário", "Exceções e recuperação"],
    checklist: ["Checklist de lançamento", "Antes de abrir ao público"],
  };
  const titles = content.toolTitles?.[toolId] ?? (toolKind ? splitTitles[toolKind] : undefined);
  if (titles && toolPool.length) {
    const chosen = pickScored(rng, toolPool, tokens, tags, effect, focusTags, 8);
    return [
      { title: titles[0], items: chosen.slice(0, 4) },
      { title: titles[1], items: chosen.slice(4, 8) },
    ];
  }
  if (toolKind === "study_plan") {
    return [
      { title: "Blocos de estudo", items: ["Bloco A (25 min): leitura ativa com anotações próprias.", "Bloco B (10 min): recuperação sem consulta.", "Bloco C (15 min): exercícios com correção imediata.", "Bloco D (5 min): revisão espaçada do erro."] },
      { title: "Regras do plano", items: ["Uma sessão perdida não cancela a semana.", "Toda sessão termina com uma pergunta escrita.", "Revisar antes de avançar, não depois.", "Medir acertos, não horas."] },
    ];
  }
  if (toolKind === "quiz") {
    return [
      { title: "Formatos de questão", items: ["Múltipla escolha com distratores plausíveis.", "Verdadeiro ou falso com justificativa obrigatória.", "Complete a lacuna com banco de palavras.", "Explique com suas palavras em até 3 linhas."] },
      { title: "Critérios de correção", items: ["Resposta correta sem justificativa vale 1 ponto.", "Justificativa coerente vale 2 pontos.", "Erro conceitual recorrente vira cartão de revisão.", "Acertos abaixo de 70% pedem nova rodada em 48h."] },
    ];
  }
  if (toolKind === "calendar") {
    return [
      { title: "Distribuição semanal", items: ["Segunda: ideia e gancho.", "Quarta: roteiro curto e gravação.", "Sexta: publicação e resposta a comentários.", "Domingo: análise de retenção e novo teste."] },
      { title: "Variações de formato", items: ["Vídeo de 15s com corte seco.", "Carrossel com uma ideia por card.", "Vídeo de resposta a comentário.", "Bastidor com uma lição prática."] },
    ];
  }
  if (toolKind === "folder_structure") {
    const project = content.id;
    return [
      { title: "Estrutura de pastas", items: ["/src", "/src/domain", "/src/features", "/src/shared", "/tests", "/docs", `/.github/workflows`, `/infra/${project}`] },
      { title: "Convenções", items: ["Uma feature por pasta, sem imports circulares.", "Contratos no domínio, adapters na borda.", "Testes espelham a estrutura de features.", "Nenhum segredo em arquivo versionado."] },
    ];
  }
  if (toolKind === "pseudocode") {
    return [
      { title: "Fluxo principal", items: ["validar entrada", "carregar estado", "aplicar regra de domínio", "persistir transação", "revalidar cache", "registrar evento"] },
      { title: "Casos de borda", items: ["entrada duplicada", "timeout do provedor", "permissão insuficiente", "estado parcial", "limite de uso atingido"] },
    ];
  }
  if (toolKind === "combination") {
    return [
      { title: "Como as ideias se conectam", items: pickScored(rng, load("concepts"), tokens, tags, effect, focusTags, 3) },
      { title: "Teste de coerência", items: ["O público das duas ideias se sobrepõe?", "Qual problema real sobra quando os modismos saem?", "A combinação cria uma nova decisão ou só um nome?", "Dá para testar em uma semana?"] },
    ];
  }
  if (toolKind === "audit") {
    return [
      { title: "Perguntas de auditoria", items: ["O problema está descrito sem jargão?", "Quem paga e por quê?", "Qual é o menor teste possível?", "O que faria você desistir?", "Qual métrica diria 'não'?"] },
      { title: "Sinais de alerta", items: ["Público definido como 'todo mundo'.", "Receita baseada apenas em escala.", "Roadmap sem etapa de validação.", "Diferencial que é só uma funcionalidade."] },
    ];
  }
  return [];
}

export function composeProject(args: {
  seed: string;
  content: CategoryContent;
  toolId: string;
  toolLabel: string;
  toolKind?: string;
  labels: SectionLabels;
  questions: Question[];
  answers: AnswerMap;
  rules: Rule[];
  focusTags: string[];
  avoidNames: Set<string>;
  existingFingerprints?: string[];
  createdAt?: string;
}): GeneratedProject {
  const {
    seed, content, toolId, toolLabel, toolKind, labels, questions, answers,
    rules, focusTags, avoidNames, existingFingerprints = [],
  } = args;

  const buildAttempt = (attempt: number): GeneratedProject => {
    const rng = createRng(`${seed}:${attempt}`);
    const tags = new Set(collectTags(answers, questions, focusTags));
    const effect = applyRules([...tags], rules);
    const tokens = buildTokens(content, questions, answers);
    tokens.name = composeName(rng, content, avoidNames);

    const conceptSentences = pickScored(rng, content.concepts, tokens, tags, effect, focusTags, 3);
    const tagline = fillTokens(rng.pick(content.taglines), tokens) ?? `${content.label} com identidade própria.`;
    const summaryFrame = pickFrame(rng, SUMMARY_FRAMES);
    const audience = pickScored(rng, content.audiences, tokens, tags, effect, focusTags, 1)[0] ?? `Público interessado em ${content.label.toLowerCase()}.`;
    const features = pickScored(rng, content.features, tokens, tags, effect, focusTags, 5);
    const highlights = pickScored(rng, content.highlights, tokens, tags, effect, focusTags, 3);
    const risks = pickScored(rng, content.risks, tokens, tags, effect, focusTags, 2);
    const nextSteps = pickScored(rng, content.nextSteps, tokens, tags, effect, focusTags, 3);
    const coreMechanic = pickScored(rng, content.mechanics, tokens, tags, effect, focusTags, 1)[0] ?? "O núcleo é uma decisão repetível com consequência clara.";
    const progression = pickScored(rng, content.progression, tokens, tags, effect, focusTags, 1)[0] ?? "A progressão é medida por marcos verificáveis.";
    const monetization = pickScored(rng, content.monetization, tokens, tags, effect, focusTags, 1)[0] ?? "Modelo a definir depois da validação.";
    const roadmap = buildRoadmap(rng, content, tokens, tags, effect, focusTags, String(answers.team ?? "solo"));
    const extras = buildExtras(rng, content, toolKind, toolId, tokens, tags, effect, focusTags);

    const first = tokens.genre ?? tokens.type ?? content.label;
    const second = tokens.focus ?? tokens.style ?? tokens.audience ?? "uma execução enxuta";
    const conceptParagraph = `${rng.pick(["", "", "Na prática, ", "De forma resumida, "])}${joinSentences(conceptSentences, rng)} ${CLOSERS[rng.int(CLOSERS.length)]}`.trim();
    const summarySentence = conceptSentences[0] ?? content.description;
    const summary = trimToSentences(
      summaryFrame
        .replace("{name}", tokens.name)
        .replace("{category}", content.singular)
        .replace("{first}", lowerFirst(first))
        .replace("{second}", lowerFirst(second))
        .replace("{audience}", lowerFirst(audience))
        .replace("{sentence}", summarySentence),
      3,
    );

    const pickedSignature = [
      ...conceptSentences, tagline, audience, ...features, ...highlights, ...risks,
      ...nextSteps, coreMechanic, progression, monetization,
      ...roadmap.map((r) => r.description), ...extras.flatMap((e) => e.items),
    ];
    const fingerprint = fingerprintFor(content.id, toolId, answers, tokens.name, pickedSignature);

    return {
      version: 1,
      seed,
      category: content.id,
      categoryLabel: content.label,
      tool: toolId,
      toolLabel,
      name: tokens.name,
      tagline,
      summary,
      concept: conceptParagraph,
      audience,
      features,
      coreMechanic,
      progression,
      monetization,
      roadmap,
      highlights,
      risks,
      nextSteps,
      extras,
      answers,
      answerLabels: {},
      tags: [...tags].sort(),
      fingerprint,
      novelty: 1,
      palette: content.accent,
      emoji: content.emoji,
      createdAt: args.createdAt ?? new Date().toISOString(),
      sectionLabels: labels,
      meta: {
        questionCount: questions.length,
        combinationSpace: content.questions.reduce((acc, q) => acc * Math.max(1, q.options.length), 1),
        engine: "deterministic-v1",
      },
    };
  };

  let project = buildAttempt(0);
  for (let attempt = 1; attempt < 12; attempt++) {
    const duplicate =
      existingFingerprints.includes(project.fingerprint) ||
      avoidNames.has(project.name.toLowerCase());
    if (!duplicate) break;
    project = buildAttempt(attempt);
    project.novelty = Math.max(0.4, 1 - attempt * 0.08);
  }
  return project;
}
