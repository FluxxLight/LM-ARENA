import type { CategoryContent, CategoryId, ToolDef } from "@/lib/generator/types";
import { games } from "./games";
import { business } from "./business";
import { apps } from "./apps";
import { creator } from "./creator";
import { study } from "./study";
import { career } from "./career";
import { coding } from "./coding";
import { creative } from "./creative";
import { ideas } from "./ideas";

export const CATEGORY_CONTENT: Record<CategoryId, CategoryContent> = {
  games,
  business,
  apps,
  creator,
  study,
  career,
  coding,
  creative,
  ideas,
};

export function getCategoryContent(category: CategoryId): CategoryContent {
  const content = CATEGORY_CONTENT[category];
  if (!content) throw new Error(`Categoria desconhecida: ${category}`);
  return content;
}

export function getTool(category: CategoryId, toolId?: string): ToolDef | null {
  if (!toolId) return null;
  return getCategoryContent(category).tools.find((tool) => tool.id === toolId) ?? null;
}

export function isKnownCategory(value: string): value is CategoryId {
  return value in CATEGORY_CONTENT;
}

export const CATEGORY_LIST = Object.values(CATEGORY_CONTENT);
