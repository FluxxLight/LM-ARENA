import { NextResponse } from "next/server";
import { isKnownCategory } from "@/content";
import { getTool } from "@/content";
import { resolveQuestions } from "@/lib/generator/questions";
import type { AnswerMap, CategoryId } from "@/lib/generator/types";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function sanitizeAnswers(input: unknown): AnswerMap {
  if (!input || typeof input !== "object") return {};
  const out: AnswerMap = {};
  const entries = Object.entries(input as Record<string, unknown>).slice(0, 40);
  for (const [key, value] of entries) {
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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`flow:${ip}`, 120)) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em instantes." }, { status: 429 });
  }
  let body: { category?: string; tool?: string; answers?: unknown; sessionSeed?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body.category || !isKnownCategory(body.category)) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  }
  const category = body.category as CategoryId;
  const tool = body.tool && body.tool !== `${category}_project` ? getTool(category, body.tool) : null;
  if (body.tool && body.tool !== `${category}_project` && !tool) {
    return NextResponse.json({ error: "Ferramenta inválida." }, { status: 400 });
  }

  const answers = sanitizeAnswers(body.answers);
  const sessionSeed = typeof body.sessionSeed === "string" ? body.sessionSeed.slice(0, 64) : "session";
  const questions = resolveQuestions(category, answers, tool?.id, sessionSeed);

  return NextResponse.json(
    {
      category,
      tool: tool?.id ?? null,
      total: questions.length,
      questions: questions.map((question, index) => ({
        index,
        total: questions.length,
        id: question.id,
        prompt: question.prompt,
        hint: question.hint ?? null,
        type: question.type,
        min: question.min ?? null,
        max: question.max ?? null,
        priority: question.priority ?? 1,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label,
          hint: option.hint ?? null,
        })),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
