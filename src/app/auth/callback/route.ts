import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/generation-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));
  const claim = url.searchParams.get("claim");
  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/auth/login?error=callback", url.origin));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "recovery" | "email" | "email_change",
    });
    if (error) return NextResponse.redirect(new URL("/auth/login?error=callback", url.origin));
  }

  let claimSucceeded = false;
  if (claim) {
    const { data: userData } = await supabase.auth.getUser();
    const guestToken = (await cookies()).get("if_guest")?.value ?? null;
    if (userData.user && guestToken) {
      const admin = createSupabaseAdminClient();
      const { data: generation } = await admin
        .from("generations")
        .select("id, user_id, guest_token_hash")
        .eq("id", claim)
        .maybeSingle();
      if (
        generation &&
        !generation.user_id &&
        generation.guest_token_hash &&
        generation.guest_token_hash === hashToken(guestToken)
      ) {
        const { error } = await admin
          .from("generations")
          .update({ user_id: userData.user.id, guest_token_hash: null })
          .eq("id", generation.id)
          .is("user_id", null);
        claimSucceeded = !error;
      }
    }
  }

  const target = new URL(next, url.origin);
  if (claim) target.searchParams.set("claim", claimSucceeded ? "ok" : "pending");
  return NextResponse.redirect(target);
}
