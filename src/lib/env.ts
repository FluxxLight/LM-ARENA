export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  return value;
}

export function supabasePublishableKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não configurada.");
  return value;
}

export function supabaseSecretKey(): string {
  const value = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("SUPABASE_SECRET_KEY não configurada (server-only).");
  return value;
}

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Vercel exposes these automatically, so metadata and share links stay
  // correct even before a custom domain is configured.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function isMockPaymentMode(): boolean {
  return process.env.MOCK_PAYMENT_MODE === "true" || process.env.PAYMENT_PROVIDER === "mock";
}

export function paymentProviderName(): string {
  return process.env.PAYMENT_PROVIDER ?? "none";
}

export function ipHashSalt(): string {
  return process.env.IP_HASH_SALT ?? "ideaforge-dev-salt";
}

export function bootstrapSecret(): string {
  return process.env.BOOTSTRAP_SECRET ?? "";
}
