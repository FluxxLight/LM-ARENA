import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectView, projectToText } from "@/components/project-view";
import { CopyButton } from "@/components/copy-button";
import { getSharedBySlug } from "@/lib/generation-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_CONTENT, isKnownCategory } from "@/content";
import { formatPrice, PLANS } from "@/config/plans";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shared = await getSharedBySlug(slug);
  if (!shared) return { title: "Projeto não encontrado", robots: { index: false, follow: false } };
  const { generation } = shared;
  const category = isKnownCategory(generation.category) ? CATEGORY_CONTENT[generation.category] : null;
  return {
    title: `${generation.title} — ${category?.label ?? "Projeto"}`,
    description: generation.summary,
    alternates: { canonical: `/share/${slug}` },
    openGraph: {
      type: "article",
      title: generation.title,
      description: generation.summary,
      url: `/share/${slug}`,
      siteName: "IDEAForge",
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(generation.title)}&subtitle=${encodeURIComponent(generation.summary)}&category=${generation.category}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: generation.title,
      description: generation.summary,
      images: [
        `/api/og?title=${encodeURIComponent(generation.title)}&subtitle=${encodeURIComponent(generation.summary)}&category=${generation.category}`,
      ],
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shared = await getSharedBySlug(slug);
  if (!shared) notFound();
  const { generation } = shared;
  const category = isKnownCategory(generation.category) ? CATEGORY_CONTENT[generation.category] : null;
  const project = generation.payload;

  const admin = createSupabaseAdminClient();
  await admin.from("shared_results").update({ views: shared.shared.views + 1 }).eq("id", shared.shared.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/40">
        <Link href="/discover" className="hover:text-white">← Descobrir</Link>
        <span className="chip">Projeto público · sem dados pessoais</span>
      </div>

      <ProjectView project={project} />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="card border-violet-500/25 bg-violet-500/[0.07] p-6">
          <p className="section-title">Gostou dessa ideia?</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Crie a sua em poucos minutos.</h2>
          <p className="mt-2 text-sm text-white/55">
            Responda perguntas adaptativas e receba um projeto completo de {category?.label ?? "sua categoria"}. O plano gratuito inclui {PLANS.free.limits.generationsPerDay} gerações por dia.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href={`/${generation.category}/forge`} className="btn-primary px-5 py-2.5">Criar meu projeto</Link>
            <Link href="/pricing" className="btn-secondary px-5 py-2.5">Ver passes · {formatPrice(PLANS.all_access.priceCents)}/mês</Link>
          </div>
        </div>
        <div className="card p-6">
          <p className="section-title">Compartilhar</p>
          <p className="mt-2 text-xs text-white/45">Copie o texto do projeto ou abra a página pública.</p>
          <div className="mt-4 flex flex-col gap-2">
            <CopyButton text={projectToText(project)} label="Copiar resultado completo" className="btn-secondary px-4 py-2 text-xs" />
            <CopyButton text={`${siteUrl()}/share/${slug}`} label="Copiar link público" className="btn-ghost px-4 py-2 text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}
