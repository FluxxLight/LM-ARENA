import { NextResponse } from "next/server";
import { remixProject } from "@/lib/generator/remixer";
import { GenerationError } from "@/lib/generator/validators";
import type { RemixMode } from "@/lib/generator/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAccess, hasPass } from "@/lib/access";
import { consumeGuestUsage, consumeUsage, UsageLimitError, clientIp } from "@/lib/usage";
import { getGenerationForViewer, createGuestToken, hashIp, hashToken } from "@/lib/generation-access";
import { awardProgress, logAnalytics } from "@/lib/gamification";
import { GUEST_LIMITS } from "@/config/plans";
import { ipHashSalt } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES: RemixMode[] = ["light", "full", "random", "professional"];

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`remix:${ip}`, 20)) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  let body: { generationId?: string; mode?: string; guestToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body.generationId || !body.mode || !MODES.includes(body.mode as RemixMode)) {
    return NextResponse.json({ error: "Dados de remix inválidos." }, { status: 400 });
  }
  const mode = body.mode as RemixMode;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const visible = await getGenerationForViewer(body.generationId, user?.id ?? null, body.guestToken);
  if (!visible) {
    return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  }

  const access = await getAccess(user?.id ?? null);
  const tool = visible.generation.payload.tool ? visible.generation.tool : null;
  if (tool && tool !== `${visible.generation.category}_project`) {
    const content = (await import("@/content")).getTool(visible.generation.category as never, tool);
    if (content && !hasPass(access, content.pass)) {
      return NextResponse.json(
        { error: "Este projeto usa uma ferramenta de Pass.", code: "PASS_REQUIRED", pass: content.pass },
        { status: 403 },
      );
    }
  }

  const admin = createSupabaseAdminClient();

  try {
    if (user) {
      const usage = await consumeUsage(user.id, "remixes", access.limits);
      const { data: history } = await admin
        .from("generation_history")
        .select("name, fingerprint")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);

      const result = remixProject(visible.generation.payload, {
        mode,
        avoidNames: (history ?? []).map((row) => row.name),
        existingFingerprints: [...(history ?? []).map((row) => row.fingerprint), visible.generation.fingerprint],
      });

      const { data: inserted, error } = await admin
        .from("generations")
        .insert({
          user_id: user.id,
          category: result.project.category,
          tool: result.project.tool,
          title: result.project.name,
          summary: result.project.summary,
          payload: result.project,
          fingerprint: result.project.fingerprint,
          seed: result.project.seed,
          remix_of: visible.generation.id,
          is_public: false,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      await admin.from("generation_history").insert({
        user_id: user.id,
        category: result.project.category,
        tool: result.project.tool,
        name: result.project.name,
        fingerprint: result.project.fingerprint,
      });

      const progress = await awardProgress({
        userId: user.id,
        kind: "remix",
        meta: { mode, category: result.project.category },
      });
      await logAnalytics("generation_remixed", { mode, category: result.project.category }, user.id);

      return NextResponse.json({
        id: inserted.id,
        guest: false,
        project: result.project,
        mode: result.mode,
        modeLabel: result.modeLabel,
        changedQuestions: result.changedQuestions,
        usage,
        xp: progress,
      });
    }

    const usage = await consumeGuestUsage(hashIp(ip, ipHashSalt()));
    const result = remixProject(visible.generation.payload, { mode });
    const guestToken = createGuestToken();
    const { data: inserted, error } = await admin
      .from("generations")
      .insert({
        user_id: null,
        guest_token_hash: hashToken(guestToken),
        category: result.project.category,
        tool: result.project.tool,
        title: result.project.name,
        summary: result.project.summary,
        payload: result.project,
        fingerprint: result.project.fingerprint,
        seed: result.project.seed,
        remix_of: visible.generation.id,
        is_public: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const response = NextResponse.json({
      id: inserted.id,
      guest: true,
      project: result.project,
      mode: result.mode,
      modeLabel: result.modeLabel,
      changedQuestions: result.changedQuestions,
      usage,
      limit: GUEST_LIMITS,
    });
    response.cookies.set("if_guest", guestToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json(
        { error: "Limite diário de remix atingido.", code: "USAGE_LIMIT", kind: error.kind, limit: error.limit, upgrade: "/pricing" },
        { status: 429 },
      );
    }
    if (error instanceof GenerationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("remix_error", error);
    return NextResponse.json({ error: "Não foi possível remixar o projeto." }, { status: 500 });
  }
}
