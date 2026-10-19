/**
 * Seeds the public catalogue tables from the single source of truth in
 * src/content and src/config. Safe to re-run: every write is an upsert.
 *
 * Run with the service role key present in the environment:
 *   set -a && source .env.local && set +a && npx tsx scripts/seed.ts
 */
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_LIST } from "../src/content";
import { PLANS, PACKS } from "../src/config/plans";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn("Seed skipped: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const plans = Object.values(PLANS).map((plan, index) => ({
    id: plan.id,
    name: plan.name,
    price_cents: plan.priceCents,
    currency: plan.currency,
    interval: plan.interval,
    includes: plan.includes,
    limits: plan.limits,
    description: plan.description,
    active: true,
    sort_order: index,
  }));
  expect("plans", await supabase.from("plans").upsert(plans, { onConflict: "id" }));

  expect(
    "packs",
    await supabase.from("packs").upsert(
      PACKS.map((pack) => ({
        id: pack.id,
        name: pack.name,
        description: pack.description,
        price_cents: pack.priceCents,
        currency: pack.currency,
        credits: pack.credits,
        bonus_remixes: pack.bonusRemixes,
        active: true,
      })),
      { onConflict: "id" },
    ),
  );

  expect(
    "categories",
    await supabase.from("categories").upsert(
      CATEGORY_LIST.map((category, index) => ({
        id: category.id,
        label: category.label,
        description: category.description,
        emoji: category.emoji,
        accent: category.accent,
        sort_order: index,
        active: true,
      })),
      { onConflict: "id" },
    ),
  );

  const toolQuestionIds = new Map<string, string>();
  for (const category of CATEGORY_LIST) {
    for (const tool of category.tools) {
      for (const question of tool.extraQuestions ?? []) toolQuestionIds.set(`${category.id}:${question.id}`, tool.id);
    }
  }

  expect(
    "question_sets",
    await supabase.from("question_sets").upsert(
      CATEGORY_LIST.map((category) => ({
        id: `${category.id}_v1`,
        category_id: category.id,
        name: `${category.label} — base v1`,
        version: 1,
        active: true,
      })),
      { onConflict: "id" },
    ),
  );

  for (const category of CATEGORY_LIST) {
    expect(
      `questions:${category.id}`,
      await supabase.from("questions").upsert(
        category.questions.map((question, index) => ({
          category_id: category.id,
          id: question.id,
          set_id: `${category.id}_v1`,
          prompt: question.prompt,
          hint: question.hint ?? null,
          type: question.type,
          min_select: question.min ?? null,
          max_select: question.max ?? null,
          requires_tags: question.requires ?? [],
          excludes_tags: question.excludes ?? [],
          tool_id: toolQuestionIds.get(`${category.id}:${question.id}`) ?? (question.tools?.[0] ?? null),
          follow_up_only: question.followUpOnly ?? false,
          priority: question.priority ?? 1,
          sort_order: index,
          active: true,
        })),
        { onConflict: "category_id,id" },
      ),
    );

    const options = category.questions.flatMap((question, questionIndex) =>
      question.options.map((option, optionIndex) => ({
        category_id: category.id,
        question_id: question.id,
        id: option.id,
        label: option.label,
        hint: option.hint ?? null,
        tags: option.tags ?? [],
        weight: option.weight ?? 1,
        conflicts: option.conflicts ?? [],
        follow_ups: option.followUps ?? [],
        sort_order: questionIndex * 100 + optionIndex,
        active: true,
      })),
    );
    expect(
      `options:${category.id}`,
      await supabase.from("question_options").upsert(options, { onConflict: "category_id,question_id,id" }),
    );

    const slots: [string, { id: string; text: string; tags: string[]; weight?: number }[]][] = [
      ["concept", category.concepts],
      ["audience", category.audiences],
      ["feature", category.features],
      ["mechanic", category.mechanics],
      ["progression", category.progression],
      ["monetization", category.monetization],
      ["highlight", category.highlights],
      ["risk", category.risks],
      ["next_step", category.nextSteps],
      ["roadmap", category.roadmap],
    ];
    for (const [slot, items] of slots) {
      expect(
        `content:${category.id}:${slot}`,
        await supabase.from("content_items").upsert(
          items.map((item) => ({
            id: `${category.id}:${slot}:${item.id}`,
            category_id: category.id,
            slot,
            text: item.text,
            tags: item.tags,
            weight: item.weight ?? 1,
            active: true,
            config: {},
          })),
          { onConflict: "id" },
        ),
      );
    }

    expect(`rules:${category.id}`, await supabase.from("generation_rules").upsert(
      (category.rules ?? []).map((rule) => ({
        id: `${category.id}:${rule.id}`,
        category_id: category.id,
        when_tags: rule.when,
        boost: rule.boost ?? {},
        forbid: rule.forbid ?? [],
        reason: rule.reason ?? null,
        active: true,
      })),
      { onConflict: "id" },
    ));

    const { error: deleteTemplatesError } = await supabase
      .from("generation_templates")
      .delete()
      .eq("category_id", category.id);
    if (deleteTemplatesError) throw deleteTemplatesError;

    const templates = [
      ...category.taglines.map((template) => ({ slot: "tagline", template })),
      ...category.namePatterns.map((template) => ({ slot: "name", template })),
      ...category.roadmapTitles.map((template) => ({ slot: "roadmap_title", template })),
    ];
    expect(
      `templates:${category.id}`,
      await supabase.from("generation_templates").insert(
        templates.map((template) => ({
          category_id: category.id,
          slot: template.slot,
          template: template.template,
          active: true,
        })),
      ),
    );
  }

  // One daily challenge per day (unique(day)), rotating through categories.
  const challengeTitles: Record<string, string> = {
    games: "Forje um jogo em uma sessão",
    business: "Valide uma proposta em uma página",
    apps: "Desenhe o fluxo principal de um app",
    creator: "Crie um conceito de vídeo com gancho claro",
    study: "Monte um plano de estudo de 4 semanas",
    career: "Desenhe seu próximo passo de carreira",
    coding: "Planeje a arquitetura de um projeto",
    creative: "Crie um mundo com uma regra única",
    ideas: "Combine duas ideias distantes",
  };
  const challengeRows = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    const day = date.toISOString().slice(0, 10);
    const category = CATEGORY_LIST[(offset + new Date().getUTCDay()) % CATEGORY_LIST.length];
    challengeRows.push({
      day,
      title: challengeTitles[category.id] ?? `Desafio de ${category.label}`,
      description: `Crie um projeto completo em ${category.label} hoje. Use o questionário adaptativo e receba +25 XP ao concluir.`,
      category: category.id,
      xp_reward: 25,
      active: true,
    });
  }
  expect("daily_challenges", await supabase.from("daily_challenges").upsert(challengeRows, { onConflict: "day" }));

  console.log("Seed complete.");
}

function expect(label: string, result: { error: { message: string } | null }) {
  if (result.error) {
    console.error(`✗ ${label}: ${result.error.message}`);
    throw new Error(`${label} failed`);
  }
  console.log(`✓ ${label}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    if (process.env.SEED_STRICT === "1") process.exit(1);
    console.warn("Continuing without seeding (set SEED_STRICT=1 to fail the build instead).");
    process.exit(0);
  });
