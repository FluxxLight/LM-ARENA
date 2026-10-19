import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. NEVER import this from a Client Component.
 * All writes that must not be trusted to the browser go through here or
 * through server-only SQL functions.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "ideaforge-server" } },
  });
  return cached;
}
