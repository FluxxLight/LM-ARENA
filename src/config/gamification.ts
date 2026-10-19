export const XP_RULES = {
  project_created: 10,
  remix: 5,
  share: 10,
  challenge: 25,
  daily_login: 2,
  first_project_bonus: 15,
} as const;

export type XpKind = keyof typeof XP_RULES;

export const LEVELS = [
  { key: "explorer", label: "Explorer", min: 0, emoji: "🧭" },
  { key: "creator", label: "Creator", min: 100, emoji: "✍️" },
  { key: "builder", label: "Builder", min: 300, emoji: "🛠️" },
  { key: "innovator", label: "Innovator", min: 700, emoji: "🚀" },
  { key: "visionary", label: "Visionary", min: 1500, emoji: "🔭" },
] as const;

export type LevelKey = (typeof LEVELS)[number]["key"];

export function levelForXp(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const level of LEVELS) if (xp >= level.min) current = level;
  const index = LEVELS.findIndex((l) => l.key === current.key);
  const next = LEVELS[index + 1] ?? null;
  const span = next ? next.min - current.min : 1;
  const progress = next ? Math.min(100, Math.round(((xp - current.min) / span) * 100)) : 100;
  return { ...current, next, progress, index };
}

export interface BadgeDef {
  key: string;
  label: string;
  description: string;
  emoji: string;
}

export const BADGES: BadgeDef[] = [
  { key: "first_forge", label: "Primeira Forja", description: "Criou seu primeiro projeto.", emoji: "🔥" },
  { key: "forge_10", label: "Forja em Série", description: "Criou 10 projetos.", emoji: "⚒️" },
  { key: "explorer_all", label: "Polímata", description: "Criou projetos em todas as 9 categorias.", emoji: "🌐" },
  { key: "first_share", label: "Voz da Ideia", description: "Compartilhou um projeto publicamente.", emoji: "📣" },
  { key: "remix_master", label: "Remix Master", description: "Fez 5 remixes.", emoji: "🔀" },
  { key: "streak_3", label: "Constância", description: "Manteve uma sequência de 3 dias.", emoji: "📅" },
  { key: "streak_7", label: "Semana de Fogo", description: "Manteve uma sequência de 7 dias.", emoji: "🗓️" },
  { key: "challenger", label: "Desafiante", description: "Completou um desafio diário.", emoji: "🎯" },
];
