import "server-only";
import { PASSES, PLANS, type FeatureKey, type PlanId, type PlanLimits } from "@/config/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Access {
  features: Set<FeatureKey>;
  planId: PlanId;
  limits: PlanLimits;
  isAllAccess: boolean;
  passes: FeatureKey[];
}

export async function getAccess(userId: string | null): Promise<Access> {
  if (!userId) {
    return {
      features: new Set(),
      planId: "free",
      limits: PLANS.free.limits,
      isAllAccess: false,
      passes: [],
    };
  }
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("entitlements")
    .select("feature_key, expires_at")
    .eq("user_id", userId)
    .is("revoked_at", null);

  const features = new Set<FeatureKey>();
  for (const row of data ?? []) {
    if (row.expires_at && row.expires_at < now) continue;
    features.add(row.feature_key as FeatureKey);
  }

  const isAllAccess = features.has("all_access");
  const passes = PASSES.map((p) => p.key).filter((key) => isAllAccess || features.has(key));
  const planId = (isAllAccess ? "all_access" : (passes[0] ?? "free")) as PlanId;
  const limits = planId === "free" ? PLANS.free.limits : PLANS[planId].limits;

  return { features, planId, limits, isAllAccess, passes };
}

export function hasPass(access: Access, pass: FeatureKey): boolean {
  return access.isAllAccess || access.features.has("all_access") || access.features.has(pass);
}

export async function getUsageToday(userId: string) {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("usage_daily")
    .select("generations, remixes, shares, day")
    .eq("user_id", userId)
    .eq("day", today)
    .maybeSingle();
  return {
    generations: data?.generations ?? 0,
    remixes: data?.remixes ?? 0,
    shares: data?.shares ?? 0,
    day: today,
  };
}
