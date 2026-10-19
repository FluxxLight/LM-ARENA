import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { BADGES, XP_RULES, type XpKind } from "@/config/gamification";

export interface GamificationResult {
  xpAwarded: number;
  totalXp: number;
  streak: number;
  unlocked: { key: string; label: string; emoji: string }[];
}

/**
 * Awards XP and evaluates badges using the service role. Client code can never
 * call this: `award_xp` and all write paths are restricted to service_role.
 */
export async function awardProgress(params: {
  userId: string;
  kind: XpKind;
  meta?: Record<string, unknown>;
  touchStreak?: boolean;
  challengeId?: string | null;
}): Promise<GamificationResult> {
  const { userId, kind, meta = {}, touchStreak = true, challengeId } = params;
  const admin = createSupabaseAdminClient();

  let amount = XP_RULES[kind] ?? 0;
  const { count: projectCount } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (kind === "project_created" && (projectCount ?? 0) === 1) {
    amount += XP_RULES.first_project_bonus;
  }

  if (challengeId) {
    const { data: challenge } = await admin
      .from("daily_challenges")
      .select("id, xp_reward")
      .eq("id", challengeId)
      .maybeSingle();
    if (challenge) {
      const { error } = await admin.from("user_challenges").insert({
        user_id: userId,
        challenge_id: challenge.id,
      });
      if (!error) amount += Number(challenge.xp_reward ?? XP_RULES.challenge);
    }
  }

  let totalXp = 0;
  if (amount > 0) {
    const { data } = await admin.rpc("award_xp", {
      p_user: userId,
      p_kind: kind,
      p_amount: amount,
      p_meta: meta,
    });
    totalXp = Number(data ?? 0);
  } else {
    const { data } = await admin.from("profiles").select("xp").eq("id", userId).maybeSingle();
    totalXp = Number(data?.xp ?? 0);
  }

  let streak = 0;
  if (touchStreak) {
    const { data } = await admin.rpc("touch_streak", { p_user: userId });
    streak = Number(data ?? 0);
  } else {
    const { data } = await admin.from("profiles").select("streak_days").eq("id", userId).maybeSingle();
    streak = Number(data?.streak_days ?? 0);
  }

  const unlocked = await evaluateBadges(userId);

  await admin.from("analytics_events").insert({
    user_id: userId,
    name: `xp_${kind}`,
    properties: { amount, totalXp, ...meta },
  });

  return { xpAwarded: amount, totalXp, streak, unlocked };
}

export async function evaluateBadges(userId: string): Promise<GamificationResult["unlocked"]> {
  const admin = createSupabaseAdminClient();
  const [{ data: profile }, { count: projectCount }, { data: categoryRows }, { count: remixCount }, { count: challengeCount }, { data: generationRows }] =
    await Promise.all([
      admin.from("profiles").select("streak_days").eq("id", userId).maybeSingle(),
      admin.from("generations").select("id", { count: "exact", head: true }).eq("user_id", userId),
      admin.from("generations").select("category").eq("user_id", userId).limit(500),
      admin.from("generations").select("id", { count: "exact", head: true }).eq("user_id", userId).not("remix_of", "is", null),
      admin.from("user_challenges").select("challenge_id", { count: "exact", head: true }).eq("user_id", userId),
      admin.from("generations").select("id").eq("user_id", userId).limit(500),
    ]);

  const generationIds = (generationRows ?? []).map((row) => row.id);
  let shareCount = 0;
  if (generationIds.length) {
    const { count } = await admin
      .from("shared_results")
      .select("id", { count: "exact", head: true })
      .in("generation_id", generationIds);
    shareCount = count ?? 0;
  }

  const distinctCategories = new Set((categoryRows ?? []).map((c) => c.category)).size;
  const earned = new Set<string>();
  if ((projectCount ?? 0) >= 1) earned.add("first_forge");
  if ((projectCount ?? 0) >= 10) earned.add("forge_10");
  if (distinctCategories >= 9) earned.add("explorer_all");
  if (shareCount >= 1) earned.add("first_share");
  if ((remixCount ?? 0) >= 5) earned.add("remix_master");
  if ((profile?.streak_days ?? 0) >= 3) earned.add("streak_3");
  if ((profile?.streak_days ?? 0) >= 7) earned.add("streak_7");
  if ((challengeCount ?? 0) >= 1) earned.add("challenger");

  if (!earned.size) return [];
  const { data: existing } = await admin
    .from("user_achievements")
    .select("badge_key")
    .eq("user_id", userId);
  const already = new Set((existing ?? []).map((row) => row.badge_key));
  const toInsert = [...earned].filter((key) => !already.has(key));
  if (!toInsert.length) return [];

  await admin.from("user_achievements").insert(
    toInsert.map((badge_key) => ({ user_id: userId, badge_key })),
  );

  return toInsert
    .map((key) => BADGES.find((badge) => badge.key === key))
    .filter((badge): badge is (typeof BADGES)[number] => Boolean(badge))
    .map((badge) => ({ key: badge.key, label: badge.label, emoji: badge.emoji }));
}

export async function logAnalytics(
  name: string,
  properties: Record<string, unknown> = {},
  userId?: string | null,
) {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("analytics_events").insert({ user_id: userId ?? null, name, properties });
  } catch {
    // Analytics must never break a user flow.
  }
}
