import type { FeatureKey } from "@/config/plans";

export const CATEGORY_IDS = [
  "games",
  "business",
  "apps",
  "creator",
  "study",
  "career",
  "coding",
  "creative",
  "ideas",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type ToolId = string;

export type AnswerMap = Record<string, string | string[]>;

export interface QuestionOption {
  id: string;
  label: string;
  hint?: string;
  tags?: string[];
  weight?: number;
  followUps?: string[];
  conflicts?: string[];
}

export interface Question {
  id: string;
  prompt: string;
  hint?: string;
  type: "single" | "multi";
  min?: number;
  max?: number;
  options: QuestionOption[];
  /** Only show when all of these tags are present in the answer profile. */
  requires?: string[];
  /** Hide when any of these tags are present. */
  excludes?: string[];
  /** 0 = always in the first block, 1 = normal, 2 = optional/advanced. */
  priority?: number;
  /** When set, the question is only shown for these tools. */
  tools?: ToolId[];
  /** Only surfaced through another option's followUps. */
  followUpOnly?: boolean;
}

export interface ContentItem {
  id: string;
  text: string;
  tags: string[];
  weight?: number;
}

export interface Rule {
  id: string;
  /** All tags must be present for the rule to fire. */
  when: string[];
  /** Tags boosted by `boost` when the rule fires. */
  boost?: Record<string, number>;
  /** Tags removed from consideration while the rule is active. */
  forbid?: string[];
  /** Optional human-readable rationale, exposed in debug tooling. */
  reason?: string;
}

export interface ToolDef {
  id: ToolId;
  label: string;
  description: string;
  pass: FeatureKey;
  emoji: string;
  focusTags: string[];
  /** Restrict the normal category questions to these ids (order preserved). */
  questionIds?: string[];
  extraQuestions?: Question[];
  sectionLabels?: Partial<SectionLabels>;
  /** Enables deterministic, tool-specific deliverables. */
  kind?:
    | "project"
    | "character"
    | "world"
    | "quest"
    | "gdd"
    | "study_plan"
    | "quiz"
    | "calendar"
    | "folder_structure"
    | "pseudocode"
    | "combination"
    | "screens"
    | "database"
    | "architecture"
    | "flow"
    | "checklist"
    | "ideas"
    | "hooks"
    | "titles"
    | "scripts"
    | "series"
    | "cta"
    | "quiz"
    | "summary"
    | "map"
    | "review"
    | "exercises"
    | "portfolio"
    | "resume"
    | "presentation"
    | "testing"
    | "debugging"
    | "prompt"
    | "security"
    | "expand"
    | "alternatives"
    | "audit";
}

export interface SectionLabels {
  concept: string;
  audience: string;
  features: string;
  coreMechanic: string;
  progression: string;
  monetization: string;
  roadmap: string;
  highlights: string;
  risks: string;
  nextSteps: string;
}

export interface CategoryContent {
  id: CategoryId;
  label: string;
  singular: string;
  noun: string;
  emoji: string;
  accent: [string, string];
  description: string;
  seoTitle: string;
  seoDescription: string;
  sectionLabels: SectionLabels;
  namePrefixes: string[];
  nameSuffixes: string[];
  namePatterns: string[];
  taglines: string[];
  concepts: ContentItem[];
  audiences: ContentItem[];
  features: ContentItem[];
  mechanics: ContentItem[];
  progression: ContentItem[];
  monetization: ContentItem[];
  highlights: ContentItem[];
  risks: ContentItem[];
  nextSteps: ContentItem[];
  roadmap: ContentItem[];
  roadmapTitles: string[];
  questions: Question[];
  tools: ToolDef[];
  defaults: Record<string, string>;
  rules?: Rule[];
  /** Extra pools used by specialised tools, keyed by tool kind. */
  toolPools?: Partial<Record<string, ContentItem[]>>;
  /** Section titles for tool-specific deliverables, keyed by tool id. */
  toolTitles?: Partial<Record<string, [string, string]>>;
}

export interface RoadmapPhase {
  title: string;
  description: string;
  timeframe: string;
}

export interface GeneratedProject {
  version: number;
  seed: string;
  category: CategoryId;
  categoryLabel: string;
  tool: ToolId;
  toolLabel: string;
  name: string;
  tagline: string;
  summary: string;
  concept: string;
  audience: string;
  features: string[];
  coreMechanic: string;
  progression: string;
  monetization: string;
  roadmap: RoadmapPhase[];
  highlights: string[];
  risks: string[];
  nextSteps: string[];
  extras: { title: string; items: string[] }[];
  answers: AnswerMap;
  answerLabels: Record<string, string[]>;
  tags: string[];
  fingerprint: string;
  novelty: number;
  palette: [string, string];
  emoji: string;
  createdAt: string;
  sectionLabels: SectionLabels;
  meta: {
    questionCount: number;
    combinationSpace: number;
    engine: "deterministic-v1";
  };
}

export interface GenerationRequest {
  category: CategoryId;
  tool?: ToolId;
  answers: AnswerMap;
  seed?: string;
  sessionSeed?: string;
}

export interface FlowRequest {
  category: CategoryId;
  tool?: ToolId;
  answers: AnswerMap;
  sessionSeed?: string;
}

export interface FlowQuestion extends Question {
  index: number;
  total: number;
}

export type RemixMode = "light" | "full" | "random" | "professional";

export interface RemixOptions {
  mode: RemixMode;
  seed?: string;
  existingFingerprints?: string[];
  avoidNames?: string[];
}
