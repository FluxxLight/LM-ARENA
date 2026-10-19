import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { logAnalytics } from "@/lib/gamification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Provider-agnostic webhook endpoint. With no gateway connected it returns 501
 * instead of pretending something was processed.
 */
export async function POST(request: Request) {
  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json({ error: "Nenhum provedor de pagamento conectado." }, { status: 501 });
  }
  const signature =
    request.headers.get("stripe-signature") ??
    request.headers.get("x-signature") ??
    request.headers.get("x-webhook-signature");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const result = await provider.handleWebhook(payload, signature);
  await logAnalytics("payment_webhook", { ...result, provider: provider.name });
  return NextResponse.json({ received: true, ...result }, { status: result.handled ? 200 : 202 });
}
