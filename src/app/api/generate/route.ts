import { NextResponse } from "next/server";
import { isKnownCategory, getTool } from "@/content";
import { generateProject } from "@/lib/generator/engine";
import { GenerationError } from "@/lib/generator/validators";
import type { AnswerMap, CategoryId } from "@/lib/generator/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAccess, hasPass } from "@/lib/access";
import { consumeGuestUsage, consumeUsage, UsageLimitError, clientIp } from "@/lib/usage";
import { createGuestToken, hashIp, hashToken } from "@/lib/generation-access";
import { awardProgress, logAnalytics } from "@/lib/gamification";
import { GUEST_LIMITS } from "@/config/plans";
import { ipHashSalt } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeAnswers(input: unknown): AnswerMap {
  if (!input || typeof input !== "object") return {};
  const out: AnswerMap = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>).slice(0, 40)) {
    if (!/^[a-z0-9_]{1,40}$/.test(key)) continue;
    if (typeof value === "string" && value.length <= 60) out[key] = value;
    else if (Array.isArray(value)) {
      const values = value.filter((v): v is string => typeof v === "string" && v.length <= 60).slice(0, 12);
      if (values.length) out[key] = values;
    }
  }
  return out;
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`generate:${ip}`, 20)) {
    return NextResponse.json({ error: "Muitas gerações em pouco tempo." }, { status: 429 });
  }

  let body: { category?: string; tool?: string; answers?: unknown; sessionSeed?: string; challengeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.category || !isKnownCategory(body.category)) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  }
  const category = body.category as CategoryId;
  const isDefaultTool = !body.tool || body.tool === `${category}_project`;
  const tool = isDefaultTool ? null : getTool(category, body.tool!);
  if (!isDefaultTool && !tool) {
    return NextResponse.json({ error: "Ferramenta inválida." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const answers = sanitizeAnswers(body.answers);
  const sessionSeed = typeof body.sessionSeed === "string" ? body.sessionSeed.slice(0, 64) : "session";
  const admin = createSupabaseAdminClient();

  // Premium tools are gated on the server from real entitlements.
  const access = await getAccess(user?.id ?? null);
  if (tool && !hasPass(access, tool.pass)) {
    return NextResponse.json(
      {
        error: "Esta ferramenta faz parte de um Pass.",
        code: "PASS_REQUIRED",
        pass: tool.pass,
      },
      { status: 403 },
    );
  }

  try {
    if (user) {
      const usage = await consumeUsage(user.id, "generations", access.limits);
      const [{ data: history }, { data: challenge }] = await Promise.all([
        admin
          .from("generation_history")
          .select("name, fingerprint")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(40),
        body.challengeId
          ? admin.from("daily_challenges").select("id, category, day").eq("id", body.challengeId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const project = generateProject(
        { category, tool: tool?.id, answers, sessionSeed },
        {
          avoidNames: (history ?? []).map((row) => row.name),
          existingFingerprints: (history ?? []).map((row) => row.fingerprint),
        },
      );

      const challengeMatches =
        challenge && challenge.category === category && challenge.day === new Date().toISOString().slice(0, 10);

      const { data: inserted, error } = await admin
        .from("generations")
        .insert({
          user_id: user.id,
          category,
          tool: project.tool,
          title: project.name,
          summary: project.summary,
          payload: project,
          fingerprint: project.fingerprint,
          seed: project.seed,
          is_public: false,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      await admin.from("generation_history").insert({
        user_id: user.id,
        category,
        tool: project.tool,
        name: project.name,
        fingerprint: project.fingerprint,
      });

      const progress = await awardProgress({
        userId: user.id,
        kind: "project_created",
        meta: { category, tool: project.tool },
        challengeId: challengeMatches ? challenge.id : null,
      });
      await logAnalytics("generation_created", { category, tool: project.tool, pass: tool?.pass ?? null }, user.id);

      return NextResponse.json({
        id: inserted.id,
        guest: false,
        project,
        usage,
        xp: progress,
      });
    }

    // Guest flow: real DB row, capability token, IP-based daily limit.
    const usage = await consumeGuestUsage(hashIp(ip, ipHashSalt()));
    const project = generateProject({ category, tool: tool?.id, answers, sessionSeed });
    const guestToken = createGuestToken();
    const { data: inserted, error } = await admin
      .from("generations")
      .insert({
        user_id: null,
        guest_token_hash: hashToken(guestToken),
        category,
        tool: project.tool,
        title: project.name,
        summary: project.summary,
        payload: project,
        fingerprint: project.fingerprint,
        seed: project.seed,
        is_public: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await logAnalytics("generation_created_guest", { category, tool: project.tool });
    const response = NextResponse.json({ id: inserted.id, guest: true, project, usage, limit: GUEST_LIMITS });
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
        {
          error: "Limite diário atingido.",
          code: "USAGE_LIMIT",
          kind: error.kind,
          limit: error.limit,
          upgrade: "/pricing",
        },
        { status: 429 },
      );
    }
    if (error instanceof GenerationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("generate_error", error);
    return NextResponse.json({ error: "Não foi possível gerar o projeto." }, { status: 500 });
  }
}
