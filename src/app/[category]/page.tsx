import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_CONTENT, isKnownCategory } from "@/content";
import { getAccess, hasPass } from "@/lib/access";
import { getUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/config/plans";
import { combinationSpace } from "@/lib/generator/questions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: slug } = await params;
  if (!isKnownCategory(slug)) return { title: "Categoria não encontrada" };
  const category = CATEGORY_CONTENT[slug];
  return {
    title: category.seoTitle || `${category.label} — ideias e projetos`,
    description: category.seoDescription || category.description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: `${category.seoTitle} · IDEAForge`,
      description: category.seoDescription || category.description,
      url: `/${slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(category.label)}&subtitle=${encodeURIComponent(category.seoTitle)}&category=${slug}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  if (!isKnownCategory(slug)) notFound();
  const category = CATEGORY_CONTENT[slug];
  const user = await getUser();
  const access = await getAccess(user?.id ?? null);
  const admin = createSupabaseAdminClient();

  const { data: recent } = await admin
    .from("generations")
    .select("id, title, summary, category, created_at, shared_results!inner(slug, views)")
    .eq("category", slug)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(3);

  const space = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(
    combinationSpace(slug),
  );
  const sampleQuestions = category.questions.filter((q) => !q.followUpOnly).slice(0, 4);
  const plan = PLANS[`${slug}_pass`];

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-25"
          style={{
            background: `radial-gradient(700px 380px at 20% -10%, ${category.accent[0]}55, transparent 65%), radial-gradient(600px 300px at 90% 0%, ${category.accent[1]}33, transparent 60%)`,
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <nav className="text-xs text-white/40" aria-label="Trilha">
            <Link href="/" className="hover:text-white">Início</Link>
            <span className="mx-2">/</span>
            <span className="text-white/60">{category.label}</span>
          </nav>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">
                <span aria-hidden>{category.emoji}</span> {category.tools.length} ferramentas · {space}+ combinações
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                {category.label}
                <span className="mt-1 block text-white/55">{category.seoTitle.split("—")[0]?.trim()}</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">{category.description}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href={`/${slug}/forge`} className="btn-primary px-6 py-3">
                  Criar {category.noun} agora <span aria-hidden>→</span>
                </Link>
                <Link href="#ferramentas" className="btn-secondary px-6 py-3">Ver ferramentas</Link>
              </div>
              <p className="mt-3 text-xs text-white/35">
                Grátis: {PLANS.free.limits.generationsPerDay} gerações por dia · Perguntas adaptativas de 8 a 18 etapas
              </p>
            </div>
            <div className="card p-5">
              <p className="section-title">Perguntas deste território</p>
              <ul className="mt-3 space-y-2.5 text-sm text-white/60">
                {sampleQuestions.map((question) => (
                  <li key={question.id} className="flex gap-2">
                    <span className="mt-1 text-violet-400" aria-hidden>•</span>
                    <span>{question.prompt}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] text-white/30">{category.questions.length} perguntas no banco, incluindo condicionais.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="ferramentas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-title">Ferramentas</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Cada saída com uma estrutura própria</h2>
          </div>
          {plan && (
            <p className="text-sm text-white/45">
              {plan.name}: <span className="text-white/70">{plan.description}</span>
            </p>
          )}
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href={`/${slug}/forge`} className="card card-hover flex flex-col p-5">
            <span className="text-2xl" aria-hidden>{category.emoji}</span>
            <h3 className="mt-3 text-sm font-semibold text-white">{category.label} · Projeto completo</h3>
            <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-white/50">
              A experiência principal: um projeto inteiro a partir das suas escolhas.
            </p>
            <span className="mt-4 text-xs font-medium text-violet-300">Incluído no gratuito →</span>
          </Link>
          {category.tools.map((tool) => {
            const unlocked = hasPass(access, tool.pass);
            return (
              <Link key={tool.id} href={`/${slug}/forge?tool=${tool.id}`} className="card card-hover flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <span className="text-2xl" aria-hidden>{tool.emoji}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${unlocked ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.05] text-white/40"}`}>
                    {unlocked ? "Liberado" : "Pass"}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{tool.label}</h3>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-white/50">{tool.description}</p>
                <span className="mt-4 text-xs font-medium text-violet-300">
                  {unlocked ? "Usar ferramenta →" : "Desbloquear →"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {recent && recent.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold text-white">Projetos públicos recentes</h2>
            <Link href={`/discover?category=${slug}`} className="text-sm text-violet-300 hover:text-violet-200">Ver todos →</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {recent.map((item) => {
              const shared = Array.isArray(item.shared_results) ? item.shared_results[0] : item.shared_results;
              return (
                <Link key={item.id} href={shared?.slug ? `/share/${shared.slug}` : "/discover"} className="card card-hover p-5">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1.5 line-clamp-2 text-xs text-white/45">{item.summary}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-white/30">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-white">Precisa de todas as ferramentas?</h2>
            <p className="mt-1 text-sm text-white/50">O {plan?.name} libera {category.tools.length} ferramentas e limites maiores.</p>
          </div>
          <Link href="/pricing" className="btn-secondary px-5 py-2.5">Ver {plan?.name}</Link>
        </div>
      </section>
    </>
  );
}
