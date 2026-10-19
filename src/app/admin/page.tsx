import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_LIST } from "@/content";
import { PLANS, PASSES } from "@/config/plans";
import { BADGES, LEVELS } from "@/config/gamification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const [profiles, generations, shared, payments, challenges, upcoming] = await Promise.all([
    admin.from("profiles").select("id, role, xp, streak_days, created_at", { count: "exact" }),
    admin.from("generations").select("id, category, created_at", { count: "exact" }),
    admin.from("shared_results").select("id", { count: "exact", head: true }),
    admin.from("payment_events").select("id", { count: "exact", head: true }),
    admin.from("daily_challenges").select("id", { count: "exact", head: true }),
    admin.from("generations").select("id, title, category, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const totalProfiles = profiles.count ?? 0;
  const admins = (profiles.data ?? []).filter((row) => row.role === "admin").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-title">Área restrita</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Administração</h1>
        </div>
        <Link href="/dashboard" className="btn-secondary px-4 py-2 text-xs">Voltar ao painel</Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Contas", value: totalProfiles, hint: `${admins} admin(s)` },
          { label: "Projetos", value: generations.count ?? 0, hint: "todas as contas" },
          { label: "Públicos", value: shared.count ?? 0, hint: "com página de share" },
          { label: "Eventos de pagamento", value: payments.count ?? 0, hint: "inclui simulações" },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <p className="section-title">{card.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-1 text-[11px] text-white/35">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-white">Catálogo de conteúdo</h2>
          <div className="mt-3 space-y-2">
            {CATEGORY_LIST.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2 text-xs">
                <span className="text-white/65">{category.emoji} {category.label}</span>
                <span className="text-white/35">{category.questions.length} perguntas · {category.tools.length} ferramentas</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-white/30">
            O catálogo é versionado em <code className="text-white/50">src/content</code> e espelhado nas tabelas de sistema no banco.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-white">Planos, passes e gamificação</h2>
          <ul className="mt-3 space-y-1.5 text-xs text-white/55">
            <li>{PASSES.length} passes + {PLANS.all_access.name}</li>
            <li>{PASSES.length + 1} planos configurados em <code className="text-white/40">src/config/plans.ts</code></li>
            <li>{LEVELS.length} níveis · {BADGES.length} badges</li>
            <li>{challenges.count ?? 0} desafios diários cadastrados</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/generations" className="btn-secondary px-3 py-2 text-xs">Projetos</Link>
            <Link href="/admin/payments" className="btn-secondary px-3 py-2 text-xs">Pagamentos</Link>
          </div>
        </section>
      </div>

      <section className="mt-6 card p-5">
        <h2 className="text-sm font-semibold text-white">Últimos projetos</h2>
        <div className="mt-3 divide-y divide-white/[0.05]">
          {(upcoming.data ?? []).map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
              <Link href={`/result/${row.id}`} className="text-white/65 hover:text-white">{row.title}</Link>
              <span className="text-white/35">{row.category} · {new Date(row.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
