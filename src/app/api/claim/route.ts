import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/generation-access";
import { logAnalytics } from "@/lib/gamification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Links an anonymous generation to the authenticated account. The guest token is
 * a capability proof issued at generation time and stored only as a hash, so a
 * guessed id can never steal someone else's result.
 */
export async function POST(request: Request) {
  let body: { generationId?: string; guestToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body.generationId) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }
  const cookieToken = (await cookies()).get("if_guest")?.value ?? null;
  const guestToken = body.guestToken ?? cookieToken;
  if (!guestToken) return NextResponse.json({ error: "Token ausente." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login para salvar." }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: generation } = await admin
    .from("generations")
    .select("id, user_id, guest_token_hash")
    .eq("id", body.generationId)
    .maybeSingle();

  if (!generation) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  if (generation.user_id === user.id) return NextResponse.json({ ok: true, alreadyOwned: true });
  if (generation.user_id) return NextResponse.json({ error: "Projeto já pertence a outra conta." }, { status: 409 });
  if (!generation.guest_token_hash || generation.guest_token_hash !== hashToken(guestToken)) {
    return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  }

  const { error } = await admin
    .from("generations")
    .update({ user_id: user.id, guest_token_hash: null })
    .eq("id", generation.id)
    .is("user_id", null);
  if (error) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });

  await admin.from("generation_history").insert({
    user_id: user.id,
    category: (await admin.from("generations").select("category").eq("id", generation.id).maybeSingle()).data?.category ?? "games",
    name: (await admin.from("generations").select("title").eq("id", generation.id).maybeSingle()).data?.title ?? "",
    fingerprint: `claim:${generation.id}`,
  });
  await logAnalytics("generation_claimed", { generationId: generation.id }, user.id);

  return NextResponse.json({ ok: true, redirect: `/result/${generation.id}` });
}
