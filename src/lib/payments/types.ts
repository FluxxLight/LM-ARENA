import type { PlanId } from "@/config/plans";

export type PaymentMode = "mock" | "live" | "none";

export interface CheckoutRequest {
  userId: string;
  email?: string | null;
  planId?: PlanId;
  packId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  provider: string;
  mode: PaymentMode;
  sessionId: string;
  url: string;
}

export interface WebhookResult {
  handled: boolean;
  eventType: string;
  message?: string;
}

export interface ProviderSubscription {
  planId: string | null;
  status: "active" | "canceled" | "past_due" | "none";
  currentPeriodEnd: string | null;
  provider: string;
}

export interface PaymentProvider {
  name: string;
  mode: PaymentMode;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  handleWebhook(payload: unknown, signature: string | null): Promise<WebhookResult>;
  getSubscription(userId: string): Promise<ProviderSubscription>;
  cancelSubscription(userId: string): Promise<{ ok: boolean; message: string }>;
}
