import type { Rng } from "./randomizer";

/**
 * Human-written sentence frames. Content banks provide the substance; these
 * frames provide structural variety so two projects never read the same even
 * when they share a few content items.
 */
export const CONCEPT_OPENERS = [
  "A premissa é direta:",
  "O conceito parte de uma tensão simples:",
  "A ideia nasce de uma pergunta prática:",
  "Em vez de começar pelo escopo, o projeto começa pela experiência:",
  "O ponto de partida é uma escolha do jogador, não uma cutscene:",
  "A proposta evita prometer o mundo inteiro e foca em uma sensação:",
  "Tudo começa com uma restrição de design que vira identidade:",
  "O projeto foi desenhado de trás para frente, a partir do momento mais memorável:",
];

export const CONNECTORS = [
  "Na prática,", "Ao mesmo tempo,", "Além disso,", "O detalhe importante é que",
  "A consequência é que", "Em paralelo,", "Do ponto de vista do usuário,", "Já na segunda camada,",
];

export const SUMMARY_FRAMES = [
  "{name} é um projeto de {category} criado a partir de escolhas concretas. {sentence}",
  "A ideia combina {first} com {second}. {sentence}",
  "{name} transforma {first} em uma experiência de {category}, com {second}. {sentence}",
  "Um projeto de {category} que parte de {first} e assume {second} como diferencial. {sentence}",
  "O diferencial de {name} está em cruzar {first} com {second}. {sentence}",
  "{sentence} É a partir dessa base que {name} define seu posicionamento em {category}.",
  "{name} foi desenhado para {audience}. {sentence}",
  "Com foco em {first}, o projeto usa {second} para criar identidade. {sentence}",
];

export const CLOSERS = [
  "O primeiro ciclo serve para provar que o núcleo funciona antes de crescer.",
  "A prioridade é validar a experiência central com o menor escopo possível.",
  "Nada entra no MVP sem uma pergunta de validação associada.",
  "O sucesso inicial é medido por clareza e vontade de repetir, não por vaidade.",
  "O projeto foi pensado para evoluir em camadas, começando pelo essencial.",
  "A ambição fica no posicionamento; o primeiro passo fica pequeno e verificável.",
];

export function pickFrame(rng: Rng, frames: string[]): string {
  return frames[rng.int(frames.length)] ?? frames[0];
}

export function joinSentences(parts: string[], rng: Rng): string {
  const cleaned = parts.map((p) => p.trim()).filter(Boolean);
  if (!cleaned.length) return "";
  let out = cleaned[0];
  for (let i = 1; i < cleaned.length; i++) {
    const connector = CONNECTORS[rng.int(CONNECTORS.length)];
    const sentence = cleaned[i];
    out += ` ${connector} ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
  }
  return out;
}

export function sentenceCount(text: string): number {
  return (text.match(/[.!?](\s|$)/g) ?? []).length;
}

export function trimToSentences(text: string, max: number): string {
  if (sentenceCount(text) <= max) return text;
  const matches = [...text.matchAll(/[^.!?]+[.!?]+/g)].slice(0, max);
  return matches.map((m) => m[0].trim()).join(" ");
}

export function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function lowerFirst(text: string): string {
  return lowerLabel(text);
}

/**
 * Lowercases a label for use mid-sentence, preserving short acronyms
 * ("PC", "RPG", "MVP") that would look broken in lowercase.
 */
export function lowerLabel(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (/^[A-Z0-9][A-Z0-9-]{1,4}$/.test(trimmed)) return trimmed;
  return trimmed.toLowerCase();
}

export function withArticle(word: string): string {
  const lower = word.toLowerCase();
  if (/^(a|e|i|o|u)/.test(lower)) return `uma ${lower}`;
  return `um ${lower}`;
}
