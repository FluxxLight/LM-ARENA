import "server-only";
import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";
import { paymentProviderName, isMockPaymentMode } from "@/lib/env";

/**
 * Provider selection. A real gateway can be added by implementing
 * PaymentProvider and registering it here — nothing else in the app needs to
 * change. When no provider is connected, checkout is unavailable (never faked).
 */
export function getPaymentProvider(): PaymentProvider | null {
  if (paymentProviderName() === "mock" && isMockPaymentMode()) return mockProvider;
  return null;
}

export function paymentsAvailable(): boolean {
  const provider = getPaymentProvider();
  return Boolean(provider);
}

export function paymentsMode(): "mock" | "live" | "none" {
  const provider = getPaymentProvider();
  return provider?.mode ?? "none";
}

export type { CheckoutRequest, CheckoutResult, PaymentProvider, ProviderSubscription, WebhookResult } from "./types";
