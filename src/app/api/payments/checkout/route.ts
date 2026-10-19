import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { PLANS, PACKS, type PlanId } from "@/config/plans";
import { siteUrl } from "@/lib/env";
import { logAnalytics } from "@/lib/gamification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login para continuar.", code: "AUTH_REQUIRED" }, { status: 401 });

  let body: { planId?: string; packId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const planId = body.planId && body.planId in PLANS ? (body.planId as PlanId) : undefined;
  const packId = body.packId && PACKS.some((p) => p.id === body.packId) ? body.packId : undefined;
  if (!planId && !packId) return NextResponse.json({ error: "Plano ou pack inválido." }, { status: 400 });

  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "Nenhum provedor de pagamento conectado. Configure PAYMENT_PROVIDER para ativar.", code: "PROVIDER_UNAVAILABLE" },
      { status: 503 },
    );
  }

  try {
    const checkout = await provider.createCheckout({
      userId: user.id,
      email: user.email,
      planId,
      packId,
      successUrl: `${siteUrl()}/dashboard/passes?status=success`,
      cancelUrl: `${siteUrl()}/pricing?status=cancelled`,
    });
    await logAnalytics("checkout_started", { planId: planId ?? null, packId: packId ?? null, provider: provider.name }, user.id);
    return NextResponse.json(checkout);
  } catch (error) {
    console.error("checkout_error", error);
    return NextResponse.json({ error: "Não foi possível iniciar o checkout." }, { status: 500 });
  }
}
