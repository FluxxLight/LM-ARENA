import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GeneratedProject } from "@/lib/generator/types";

export interface GenerationRow {
  id: string;
  user_id: string | null;
  guest_token_hash: string | null;
  category: string;
  tool: string;
  title: string;
  summary: string;
  payload: GeneratedProject;
  fingerprint: string;
  seed: string | null;
  is_public: boolean;
  remix_of: string | null;
  created_at: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createGuestToken(): string {
  return randomBytes(24).toString("base64url");
}

export function createShareSlug(): string {
  return randomBytes(9).toString("base64url").replace(/[-_]/g, "x").slice(0, 10).toLowerCase();
}

export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function getGenerationById(id: string): Promise<GenerationRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("generations").select("*").eq("id", id).maybeSingle();
  return (data as GenerationRow | null) ?? null;
}

/**
 * Returns a generation only when the viewer is the owner, the guest holding the
 * capability token, or the result is explicitly public. Never trusts a client
 * supplied user id.
 */
export async function getGenerationForViewer(
  id: string,
  viewerId: string | null,
  guestToken?: string | null,
): Promise<{ generation: GenerationRow; relation: "owner" | "guest" | "public" } | null> {
  const generation = await getGenerationById(id);
  if (!generation) return null;
  if (viewerId && generation.user_id === viewerId) return { generation, relation: "owner" };
  if (
    !generation.user_id &&
    guestToken &&
    generation.guest_token_hash &&
    hashToken(guestToken) === generation.guest_token_hash
  ) {
    return { generation, relation: "guest" };
  }
  if (generation.is_public) return { generation, relation: "public" };
  return null;
}

export function publicPayload(generation: GenerationRow) {
  return {
    id: generation.id,
    category: generation.category,
    tool: generation.tool,
    title: generation.title,
    summary: generation.summary,
    project: generation.payload,
    createdAt: generation.created_at,
  };
}

export async function getSharedBySlug(slug: string) {
  const admin = createSupabaseAdminClient();
  const { data: shared } = await admin
    .from("shared_results")
    .select("id, slug, generation_id, views, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!shared) return null;
  const { data: generation } = await admin
    .from("generations")
    .select("*")
    .eq("id", shared.generation_id)
    .eq("is_public", true)
    .maybeSingle();
  if (!generation) return null;
  return { shared, generation: generation as GenerationRow };
}
