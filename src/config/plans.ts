/**
 * Single source of truth for commercial configuration.
 * Prices are intentionally centralised here (never inline in UI code).
 * Changing these values changes the whole product; DB rows in `plans` are a
 * catalogue/mirror used for analytics and admin, not a client-writable source.
 */

export type FeatureKey =
  | "games_pass"
  | "business_pass"
  | "apps_pass"
  | "creator_pass"
  | "study_pass"
  | "career_pass"
  | "coding_pass"
  | "creative_pass"
  | "ideas_pass"
  | "all_access";

export type PlanId = "free" | FeatureKey;

export interface PlanLimits {
  generationsPerDay: number;
  remixesPerDay: number;
  sharesPerDay: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  shortName: string;
  priceCents: number;
  currency: "BRL" | "USD";
  interval: "month" | "lifetime" | "none";
  includes: FeatureKey[];
  limits: PlanLimits;
  description: string;
  highlight?: boolean;
}

export const GUEST_LIMITS: PlanLimits = {
  generationsPerDay: 2,
  remixesPerDay: 0,
  sharesPerDay: 0,
};

export const PASSES: { key: FeatureKey; label: string; emoji: string; blurb: string; category: string }[] = [
  { key: "games_pass", label: "Games Pass", emoji: "🎮", blurb: "11 ferramentas de game design, do conceito ao GDD.", category: "games" },
  { key: "business_pass", label: "Business Pass", emoji: "💼", blurb: "Da ideia ao plano de lançamento, sem promessas de lucro.", category: "business" },
  { key: "apps_pass", label: "Apps Pass", emoji: "📱", blurb: "Conceito, telas, fluxo, arquitetura e checklist.", category: "apps" },
  { key: "creator_pass", label: "Creator Pass", emoji: "🎥", blurb: "Ganchos, roteiros, calendário e ideias de vídeo.", category: "creator" },
  { key: "study_pass", label: "Study Pass", emoji: "📚", blurb: "Planos de estudo, quizzes, exercícios e cronogramas.", category: "study" },
  { key: "career_pass", label: "Career Pass", emoji: "🧭", blurb: "Carreira, habilidades, portfólio e apresentação.", category: "career" },
  { key: "coding_pass", label: "Coding Pass", emoji: "⌨️", blurb: "Planejamento, arquitetura, estrutura e roadmap técnico.", category: "coding" },
  { key: "creative_pass", label: "Creative Pass", emoji: "🎨", blurb: "Histórias, personagens, mundos e campanhas.", category: "creative" },
  { key: "ideas_pass", label: "Ideas Pass", emoji: "💡", blurb: "Expandir, remixar, combinar e converter ideias.", category: "ideas" },
];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    shortName: "Free",
    priceCents: 0,
    currency: "BRL",
    interval: "none",
    includes: [],
    limits: { generationsPerDay: 5, remixesPerDay: 1, sharesPerDay: 3 },
    description: "Para experimentar o motor completo com limites diários.",
  },
  games_pass: {
    id: "games_pass",
    name: "Games Pass",
    shortName: "Games",
    priceCents: 1900,
    currency: "BRL",
    interval: "month",
    includes: ["games_pass"],
    limits: { generationsPerDay: 60, remixesPerDay: 20, sharesPerDay: 40 },
    description: "Acesso a todas as ferramentas de Games.",
  },
  business_pass: {
    id: "business_pass",
    name: "Business Pass",
    shortName: "Business",
    priceCents: 1900,
    currency: "BRL",
    interval: "month",
    includes: ["business_pass"],
    limits: { generationsPerDay: 60, remixesPerDay: 20, sharesPerDay: 40 },
    description: "Acesso a todas as ferramentas de Business.",
  },
  apps_pass: {
    id: "apps_pass",
    name: "Apps Pass",
    shortName: "Apps",
    priceCents: 1900,
    currency: "BRL",
    interval: "month",
    includes: ["apps_pass"],
    limits: { generationsPerDay: 60, remixesPerDay: 20, sharesPerDay: 40 },
    description: "Acesso a todas as ferramentas de Apps.",
  },
  creator_pass: {
    id: "creator_pass",
    name: "Creator Pass",
    shortName: "Creator",
    priceCents: 1900,
    currency: "BRL",
    interval: "month",
    includes: ["creator_pass"],
    limits: { generationsPerDay: 60, remixesPerDay: 20, sharesPerDay: 40 },
    description: "Acesso a todas as ferramentas de Creator.",
  },
  study_pass: {
    id: "study_pass",
    name: "Study Pass",
    shortName: "Study",
    priceCents: 1900,
    currency: "BRL",
    interval: "month",
    includes: ["study_pass"],
    limits: { generationsPerDay: 60, remixesPerDay: 20, sharesPerDay: 40 },
    description: "Acesso a todas as ferramentas de Study.",
  },
  career_pass: {
    id: "career_pass",
    name: "Career Pass",
    shortName: "Career",
    priceCents: 1900,
    currency: "BRL",
    interval: "month",
    includes: ["career_pass"],
    limits: { generationsPerDay: 60, remixesPerDay: 20, sharesPerDay: 40 },
    description: "Acesso a todas as ferramentas de Career.",
  },
  coding_pass: {
    id: "coding_pass",
    name: "Coding Pass",
    shortName: "Coding",
    priceCents: 1900,
    currency: "BRL",
    interval: "month",
    includes: ["coding_pass"],
    limits: { generationsPerDay: 60, remixesPerDay: 20, sharesPerDay: 40 },
    description: "Acesso a todas as ferramentas de Coding.",
  },
  creative_pass: {
    id: "creative_pass",
    name: "Creative Pass",
    shortName: "Creative",
    priceCents: 1900,
    currency: "BRL",
    interval: "month",
    includes: ["creative_pass"],
    limits: { generationsPerDay: 60, remixesPerDay: 20, sharesPerDay: 40 },
    description: "Acesso a todas as ferramentas de Creative.",
  },
  ideas_pass: {
    id: "ideas_pass",
    name: "Ideas Pass",
    shortName: "Ideas",
    priceCents: 1900,
    currency: "BRL",
    interval: "month",
    includes: ["ideas_pass"],
    limits: { generationsPerDay: 60, remixesPerDay: 20, sharesPerDay: 40 },
    description: "Acesso a todas as ferramentas de Ideas.",
  },
  all_access: {
    id: "all_access",
    name: "All Access",
    shortName: "All Access",
    priceCents: 4900,
    currency: "BRL",
    interval: "month",
    includes: PASSES.map((p) => p.key),
    limits: { generationsPerDay: 200, remixesPerDay: 100, sharesPerDay: 150 },
    description: "Todos os passes e todas as ferramentas, com limites altos.",
    highlight: true,
  },
};

export const PACKS = [
  {
    id: "starter_pack",
    name: "Pack Iniciante",
    description: "20 gerações extras + 5 remixes.",
    priceCents: 900,
    currency: "BRL" as const,
    credits: 20,
    bonusRemixes: 5,
  },
  {
    id: "forge_pack",
    name: "Pack Forge",
    description: "60 gerações extras + 20 remixes.",
    priceCents: 1900,
    currency: "BRL" as const,
    credits: 60,
    bonusRemixes: 20,
  },
  {
    id: "studio_pack",
    name: "Pack Studio",
    description: "200 gerações extras + 80 remixes.",
    priceCents: 4900,
    currency: "BRL" as const,
    credits: 200,
    bonusRemixes: 80,
  },
];

export const PLAN_LIST = Object.values(PLANS);
export const PAID_PLANS = PLAN_LIST.filter((p) => p.id !== "free");

export function formatPrice(cents: number, currency: "BRL" | "USD" = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS[planId]?.limits ?? PLANS.free.limits;
}

export function passForCategory(category: string): FeatureKey {
  return `${category}_pass` as FeatureKey;
}

export function planForPass(pass: FeatureKey): Plan {
  return PLANS[pass] ?? PLANS.free;
}
