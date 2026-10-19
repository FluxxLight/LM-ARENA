import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_CONTENT, isKnownCategory } from "@/content";
import type { CategoryId } from "@/lib/generator/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Descobrir projetos públicos",
  description: "Explore projetos públicos criados no IDEAForge: jogos, negócios, apps, conteúdo, estudos, carreira, código, histórias e ideias.",
  alternates: { canonical: "/discover" },
};

interface Row {
  id: string;
  title: string;
  summary: string;
  category: string;
  created_at: string;
  shared_results: { slug: string; views: number } | { slug: string; views: number }[] | null;
}

const SORTS = [
  { key: "recent", label: "Recentes" },
  { key: "popular", label: "Mais vistos" },
  { key: "trending", label: "Em alta" },
] as const;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const category = params.category && isKnownCategory(params.category) ? (params.category as CategoryId) : null;
  const sort = SORTS.some((item) => item.key === params.sort) ? (params.sort as (typeof SORTS)[number]["key"]) : "recent";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const perPage = 12;

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("generations")
    .select("id, title, summary, category, created_at, shared_results!inner(slug, views)", { count: "exact" })
    .eq("is_public", true);
  if (category) query = query.eq("category", category);

  // Trending needs a small window and a score; the other sorts can be pushed to SQL.
  const { data, count } =
    sort === "recent"
      ? await query.order("created_at", { ascending: false }).range((page - 1) * perPage, page * perPage - 1)
      : await query.order("created_at", { ascending: false }).limit(200);

  const rows = ((data ?? []) as Row[]).map((row) => {
    const shared = Array.isArray(row.shared_results) ? row.shared_results[0] : row.shared_results;
    return { ...row, slug: shared?.slug ?? null, views: shared?.views ?? 0 };
  });

  const sorted = [...rows];
  if (sort === "popular") sorted.sort((a, b) => b.views - a.views || b.created_at.localeCompare(a.created_at));
  if (sort === "trending") {
    const now = Date.now();
    sorted.sort((a, b) => {
      const score = (item: (typeof rows)[number]) => {
        const days = Math.max(0.5, (now - new Date(item.created_at).getTime()) / 86_400_000);
        return (item.views + 1) / Math.pow(days, 0.8);
      };
      return score(b) - score(a);
    });
  }
  const visible = sort === "recent" ? sorted : sorted.slice((page - 1) * perPage, page * perPage);
  const total = sort === "recent" ? (count ?? sorted.length) : sorted.length;
  const pages = Math.max(1, Math.ceil(total / perPage));

  function href(next: Record<string, string | undefined>) {
    const search = new URLSearchParams();
    if (category) search.set("category", category);
    if (sort !== "recent") search.set("sort", sort);
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    const query = search.toString();
    return `/discover${query ? `?${query}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-title">Galeria pública</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Descobrir</h1>
          <p className="mt-2 max-w-xl text-sm text-white/50">
            Projetos que outras pessoas escolheram publicar. Nenhum dado pessoal é exibido — apenas o resultado do motor.
          </p>
        </div>
        <Link href="/#categorias" className="btn-primary px-5 py-2.5">Criar o meu</Link>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Link href={href({ category: undefined, page: undefined })} className={`chip ${!category ? "border-violet-400/60 bg-violet-500/10 text-white" : ""}`}>
          Todas
        </Link>
        {Object.values(CATEGORY_CONTENT).map((item) => (
          <Link
            key={item.id}
            href={href({ category: item.id, page: undefined })}
            className={`chip ${category === item.id ? "border-violet-400/60 bg-violet-500/10 text-white" : ""}`}
          >
            {item.emoji} {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 w-fit">
        {SORTS.map((item) => (
          <Link
            key={item.key}
            href={href({ sort: item.key === "recent" ? undefined : item.key, page: undefined })}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${sort === item.key ? "bg-white/10 text-white" : "text-white/45 hover:text-white"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-2xl" aria-hidden>🌱</p>
          <h2 className="mt-3 text-lg font-semibold text-white">Ainda não há projetos públicos por aqui</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/45">
            Seja a primeira pessoa a publicar. Crie um projeto, abra o resultado e use “Compartilhar”.
          </p>
          <Link href={category ? `/${category}/forge` : "/#categorias"} className="btn-primary mt-5 px-5 py-2.5">Criar agora</Link>
        </div>
      ) : (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => {
            const meta = isKnownCategory(item.category) ? CATEGORY_CONTENT[item.category] : null;
            return (
              <Link
                key={item.id}
                href={item.slug ? `/share/${item.slug}` : "#"}
                className="card card-hover flex flex-col p-5"
              >
                <div className="flex items-center justify-between text-[11px] text-white/35">
                  <span className="chip">{meta?.emoji} {meta?.label ?? item.category}</span>
                  <span>{item.views} {item.views === 1 ? "view" : "views"}</span>
                </div>
                <h2 className="mt-3 text-base font-semibold text-white">{item.title}</h2>
                <p className="mt-1.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-white/45">{item.summary}</p>
                <p className="mt-4 text-[10px] uppercase tracking-wider text-white/30">
                  {new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Paginação">
          {page > 1 && (
            <Link href={href({ page: String(page - 1) })} className="btn-secondary px-3 py-2 text-xs">← Anterior</Link>
          )}
          <span className="text-xs text-white/40">Página {page} de {pages}</span>
          {page < pages && (
            <Link href={href({ page: String(page + 1) })} className="btn-secondary px-3 py-2 text-xs">Próxima →</Link>
          )}
        </nav>
      )}
    </div>
  );
}
