import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider, paymentsMode } from "@/lib/payments";
import { PLANS, PACKS, type FeatureKey, type PlanId } from "@/config/plans";
import { logAnalytics } from "@/lib/gamification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Simulated activation for the mock provider. It is only reachable when
 * MOCK_PAYMENT_MODE=true and is always labelled as a simulation in the UI.
 * It never contacts a payment gateway and never charges anyone.
 */
export async function POST(request: Request) {
  if (paymentsMode() !== "mock") {
    return NextResponse.json({ error: "Simulação desativada." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  let body: { planId?: string; packId?: string; session?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const provider = getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "Provedor indisponível." }, { status: 503 });

  const admin = createSupabaseAdminClient();

  if (body.planId && body.planId in PLANS && body.planId !== "free") {
    const planId = body.planId as PlanId;
    const pass = planId as FeatureKey;
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: entError } = await admin.from("entitlements").upsert(
      {
        user_id: user.id,
        feature_key: pass,
        source: "mock_checkout",
        expires_at: periodEnd,
        revoked_at: null,
      },
      { onConflict: "user_id,feature_key" },
    );
    if (entError) return NextResponse.json({ error: entError.message }, { status: 500 });

    await admin.from("subscriptions").insert({
      user_id: user.id,
      provider: "mock",
      provider_ref: body.session ?? `mock_${user.id}_${Date.now()}`,
      plan_id: planId,
      status: "active",
      current_period_end: periodEnd,
    });
    await admin.from("payment_events").insert({
      user_id: user.id,
      provider: "mock",
      event_type: "checkout.simulated",
      status: "succeeded",
      amount_cents: 0,
      payload: { plan_id: planId, simulated: true, note: "Nenhum valor foi cobrado." },
    });
    await logAnalytics("mock_pass_activated", { planId }, user.id);
    return NextResponse.json({ ok: true, simulated: true, planId, expiresAt: periodEnd });
  }

  if (body.packId && PACKS.some((p) => p.id === body.packId)) {
    const pack = PACKS.find((p) => p.id === body.packId)!;
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await admin
      .from("usage_daily")
      .select("bonus_generations, bonus_remixes")
      .eq("user_id", user.id)
      .eq("day", today)
      .maybeSingle();
    const { error } = await admin.from("usage_daily").upsert(
      {
        user_id: user.id,
        day: today,
        bonus_generations: (usage?.bonus_generations ?? 0) + pack.credits,
        bonus_remixes: (usage?.bonus_remixes ?? 0) + pack.bonusRemixes,
      },
      { onConflict: "user_id,day" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await admin.from("payment_events").insert({
      user_id: user.id,
      provider: "mock",
      event_type: "pack.simulated",
      status: "succeeded",
      amount_cents: 0,
      payload: { pack_id: pack.id, simulated: true, note: "Nenhum valor foi cobrado." },
    });
    await logAnalytics("mock_pack_activated", { packId: pack.id }, user.id);
    return NextResponse.json({ ok: true, simulated: true, packId: pack.id });
  }

  return NextResponse.json({ error: "Plano ou pack inválido." }, { status: 400 });
}
