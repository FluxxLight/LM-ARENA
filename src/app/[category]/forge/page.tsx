import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_CONTENT, getTool, isKnownCategory } from "@/content";
import { FlowRunner } from "@/components/flow-runner";
import { getAccess, hasPass } from "@/lib/access";
import { getUser } from "@/lib/auth";
import { PLANS } from "@/config/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: slug } = await params;
  if (!isKnownCategory(slug)) return { title: "Categoria não encontrada" };
  return {
    title: `Criar em ${CATEGORY_CONTENT[slug].label}`,
    description: `Responda perguntas adaptativas e gere um projeto completo de ${CATEGORY_CONTENT[slug].label.toLowerCase()} com o motor determinístico do IDEAForge.`,
    alternates: { canonical: `/${slug}/forge` },
  };
}

export default async function ForgePage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ tool?: string; challenge?: string }>;
}) {
  const { category: slug } = await params;
  if (!isKnownCategory(slug)) notFound();
  const { tool: toolId, challenge } = await searchParams;
  const category = CATEGORY_CONTENT[slug];
  const tool = toolId ? getTool(slug, toolId) : null;
  if (toolId && !tool) notFound();

  let challengeId: string | null = null;
  if (challenge) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("daily_challenges")
      .select("id, category, day")
      .eq("id", challenge)
      .maybeSingle();
    if (data && data.category === slug && data.day === new Date().toISOString().slice(0, 10)) {
      challengeId = data.id;
    }
  }

  const user = await getUser();
  const access = await getAccess(user?.id ?? null);
  const canUseTool = tool ? hasPass(access, tool.pass) : true;
  const passPlan = tool ? PLANS[tool.pass] : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/${slug}`} className="text-xs text-white/45 hover:text-white">← {category.label}</Link>
        <div className="flex items-center gap-2 text-[11px] text-white/35">
          <span className="chip">Sem IA</span>
          <span className="chip">Determinístico</span>
          {!user && <span className="chip">Modo visitante</span>}
        </div>
      </div>
      <FlowRunner
        category={slug}
        categoryLabel={category.label}
        categoryEmoji={category.emoji}
        toolId={tool?.id ?? null}
        toolLabel={tool?.label ?? `${category.label} · projeto completo`}
        isGuest={!user}
        canUseTool={canUseTool}
        passLabel={passPlan?.name}
        challengeId={challengeId}
      />
    </div>
  );
}
