import "server-only";
import { randomUUID } from "node:crypto";
import type { CheckoutRequest, CheckoutResult, PaymentProvider, ProviderSubscription, WebhookResult } from "./types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Mock provider: explicitly labeled as a simulation in the UI. It never claims
 * to charge money. It exists so the entitlement/subscription architecture can be
 * exercised end-to-end without a connected gateway.
 */
export const mockProvider: PaymentProvider = {
  name: "mock",
  mode: "mock",

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const sessionId = `mock_${randomUUID()}`;
    const admin = createSupabaseAdminClient();
    await admin.from("payment_events").insert({
      user_id: request.userId,
      provider: "mock",
      external_id: sessionId,
      event_type: "checkout.created",
      status: "pending",
      amount_cents: 0,
      payload: {
        plan_id: request.planId ?? null,
        pack_id: request.packId ?? null,
        simulated: true,
      },
    });
    const url = new URL("/checkout/mock", request.successUrl);
    url.searchParams.set("session", sessionId);
    if (request.planId) url.searchParams.set("plan", request.planId);
    if (request.packId) url.searchParams.set("pack", request.packId);
    return { provider: "mock", mode: "mock", sessionId, url: url.pathname + url.search };
  },

  async handleWebhook(payload: unknown): Promise<WebhookResult> {
    const body = payload as { type?: string } | null;
    return {
      handled: false,
      eventType: body?.type ?? "unknown",
      message: "Provider mock não processa webhooks reais. Nenhum valor foi cobrado.",
    };
  },

  async getSubscription(userId: string): Promise<ProviderSubscription> {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("subscriptions")
      .select("plan_id, status, current_period_end")
      .eq("user_id", userId)
      .eq("provider", "mock")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { planId: null, status: "none", currentPeriodEnd: null, provider: "mock" };
    return {
      planId: data.plan_id,
      status: data.status === "active" ? "active" : data.status === "canceled" ? "canceled" : "past_due",
      currentPeriodEnd: data.current_period_end,
      provider: "mock",
    };
  },

  async cancelSubscription(userId: string) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("subscriptions")
      .update({ status: "canceled", cancel_at_period_end: true })
      .eq("user_id", userId)
      .eq("provider", "mock")
      .eq("status", "active");
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Assinatura simulada cancelada. Nenhum valor real foi cobrado." };
  },
};
