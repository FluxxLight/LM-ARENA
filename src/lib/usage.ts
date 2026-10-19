import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { GUEST_LIMITS } from "@/config/plans";
import type { PlanLimits } from "@/config/plans";

export type UsageKind = "generations" | "remixes" | "shares";

export class UsageLimitError extends Error {
  kind: UsageKind;
  limit: number;
  constructor(kind: UsageKind, limit: number) {
    super("USAGE_LIMIT_REACHED");
    this.name = "UsageLimitError";
    this.kind = kind;
    this.limit = limit;
  }
}

export interface UsageResult {
  used: number;
  limit: number;
  remaining: number;
}

function kindLimit(limits: PlanLimits, kind: UsageKind): number {
  if (kind === "generations") return limits.generationsPerDay;
  if (kind === "remixes") return limits.remixesPerDay;
  return limits.sharesPerDay;
}

/**
 * Atomic, server-side usage consumption. The counter lives in Postgres and the
 * browser has no write access to `usage_daily`. The limit is derived from the
 * user's real entitlements on the server, never from request input.
 */
export async function consumeUsage(
  userId: string,
  kind: UsageKind,
  limits: PlanLimits,
): Promise<UsageResult> {
  const limit = kindLimit(limits, kind);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_usage", {
    p_user: userId,
    p_kind: kind,
    p_limit: limit,
  });
  if (error) {
    if (error.message.includes("USAGE_LIMIT_REACHED")) throw new UsageLimitError(kind, limit);
    throw new Error(`Falha ao contabilizar uso: ${error.message}`);
  }
  const used = Number(data ?? 0);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function consumeGuestUsage(ipHash: string): Promise<UsageResult> {
  const limit = GUEST_LIMITS.generationsPerDay;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_guest_usage", {
    p_ip_hash: ipHash,
    p_limit: limit,
  });
  if (error) {
    if (error.message.includes("USAGE_LIMIT_REACHED")) throw new UsageLimitError("generations", limit);
    throw new Error(`Falha ao contabilizar uso de visitante: ${error.message}`);
  }
  const used = Number(data ?? 0);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
