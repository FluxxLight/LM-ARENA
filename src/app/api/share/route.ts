import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAccess } from "@/lib/access";
import { consumeUsage, UsageLimitError, clientIp } from "@/lib/usage";
import { createShareSlug, getGenerationForViewer } from "@/lib/generation-access";
import { awardProgress, logAnalytics } from "@/lib/gamification";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`share:${ip}`, 30)) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  let body: { generationId?: string; guestToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body.generationId) return NextResponse.json({ error: "Projeto inválido." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Crie uma conta gratuita para compartilhar seu projeto.", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const visible = await getGenerationForViewer(body.generationId, user.id, body.guestToken);
  if (!visible) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

  const admin = createSupabaseAdminClient();
  const access = await getAccess(user.id);

  try {
    await consumeUsage(user.id, "shares", access.limits);

    const { data: existing } = await admin
      .from("shared_results")
      .select("slug")
      .eq("generation_id", visible.generation.id)
      .maybeSingle();

    let slug = existing?.slug as string | undefined;
    if (!slug) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = createShareSlug();
        const { error } = await admin
          .from("shared_results")
          .insert({ generation_id: visible.generation.id, slug: candidate });
        if (!error) {
          slug = candidate;
          break;
        }
      }
    }
    if (!slug) throw new Error("Não foi possível criar o link.");

    await admin.from("generations").update({ is_public: true }).eq("id", visible.generation.id);

    await awardProgress({ userId: user.id, kind: "share", meta: { slug }, touchStreak: false });
    await logAnalytics("generation_shared", { slug }, user.id);

    return NextResponse.json({ slug, path: `/share/${slug}`, shareable: true });
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json(
        { error: "Limite diário de compartilhamentos atingido.", code: "USAGE_LIMIT", upgrade: "/pricing" },
        { status: 429 },
      );
    }
    console.error("share_error", error);
    return NextResponse.json({ error: "Não foi possível compartilhar." }, { status: 500 });
  }
}
