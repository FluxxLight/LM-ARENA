import type { Metadata } from "next";
import Link from "next/link";
import { requireUser, getProfile, displayName, initials } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { getUsageToday } from "@/lib/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { BADGES, levelForXp } from "@/config/gamification";
import { PLANS, PASSES } from "@/config/plans";
import { CATEGORY_CONTENT, isKnownCategory } from "@/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const name = displayName(user, profile);
  const access = await getAccess(user.id);
  const usage = await getUsageToday(user.id);
  const level = levelForXp(profile?.xp ?? 0);
  const supabase = await createSupabaseServerClient();

  const [{ data: generations }, { count: sharedCount }, { data: achievements }, { count: projectCount }] = await Promise.all([
    supabase
      .from("generations")
      .select("id, title, summary, category, tool, is_public, created_at, shared_results(slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("shared_results").select("id, generations!inner(user_id)", { count: "exact", head: true }).eq("generations.user_id", user.id),
    supabase.from("user_achievements").select("badge_key, earned_at").eq("user_id", user.id),
    supabase.from("generations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const admin = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: challenges } = await admin
    .from("daily_challenges")
    .select("id, category, title, description, xp_reward")
    .eq("day", today);
  const { data: completed } = await supabase
    .from("user_challenges")
    .select("challenge_id")
    .eq("user_id", user.id)
    .in("challenge_id", (challenges ?? []).map((challenge) => challenge.id));
  const completedSet = new Set((completed ?? []).map((row) => row.challenge_id));
  const challenge = (challenges ?? []).find((item) => item.category === (generations?.[0]?.category ?? "games")) ?? challenges?.[0] ?? null;
  const challengeDone = challenge ? completedSet.has(challenge.id) : false;
  const earnedKeys = new Set((achievements ?? []).map((row) => row.badge_key));

  const usageRows = [
    { label: "Gerações", used: usage.generations, limit: access.limits.generationsPerDay },
    { label: "Remixes", used: usage.remixes, limit: access.limits.remixesPerDay },
    { label: "Compartilhamentos", used: usage.shares, limit: access.limits.sharesPerDay },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white">
            {initials(name)}
          </span>
          <div>
            <p className="text-xs text-white/40">Painel</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Olá, {name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile?.role === "admin" && <Link href="/admin" className="btn-ghost px-3 py-2 text-xs">Admin</Link>}
          <Link href="/dashboard/settings" className="btn-secondary px-4 py-2 text-xs">Configurações</Link>
          <Link href="/#categorias" className="btn-primary px-4 py-2 text-xs">Nova criação</Link>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="section-title">Nível</p>
          <p className="mt-1.5 text-lg font-semibold text-white">{level.emoji} {level.label}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: `${level.progress}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-white/35">{profile?.xp ?? 0} XP{level.next ? ` · próximo: ${level.next.label}` : " · nível máximo"}</p>
        </div>
        <div className="card p-4">
          <p className="section-title">Sequência</p>
          <p className="mt-1.5 text-lg font-semibold text-white">🔥 {profile?.streak_days ?? 0} dias</p>
          <p className="mt-1.5 text-[11px] text-white/35">{profile?.last_active_on ? `Último projeto em ${new Date(`${profile.last_active_on}T12:00:00`).toLocaleDateString("pt-BR")}` : "Crie um projeto para começar a sequência."}</p>
        </div>
        <div className="card p-4">
          <p className="section-title">Projetos</p>
          <p className="mt-1.5 text-lg font-semibold text-white">{projectCount ?? 0}</p>
          <p className="mt-1.5 text-[11px] text-white/35">Total de criações salvas na sua conta.</p>
        </div>
        <div className="card p-4">
          <p className="section-title">Compartilhados</p>
          <p className="mt-1.5 text-lg font-semibold text-white">{sharedCount ?? 0}</p>
          <p className="mt-1.5 text-[11px] text-white/35">Projetos com página pública.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Uso de hoje</h2>
            <span className="chip">{access.isAllAccess ? "All Access" : access.planId === "free" ? "Free" : access.planId.replace("_pass", "")}</span>
          </div>
          <div className="mt-4 space-y-4">
            {usageRows.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/55">{row.label}</span>
                  <span className="tabular-nums text-white/40">{row.used} / {row.limit}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={`h-full rounded-full ${row.used >= row.limit ? "bg-amber-400" : "bg-gradient-to-r from-violet-500 to-blue-500"}`}
                    style={{ width: `${Math.min(100, row.limit ? (row.used / row.limit) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/pricing" className="btn-secondary px-3 py-2 text-xs">Aumentar limites</Link>
            <Link href="/dashboard/passes" className="btn-ghost px-3 py-2 text-xs">Meus passes</Link>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Desafio diário</h2>
            {challengeDone ? <span className="chip border-emerald-400/30 text-emerald-300">Concluído</span> : <span className="chip">+{challenge?.xp_reward ?? 25} XP</span>}
          </div>
          {challenge ? (
            <>
              <p className="mt-3 text-sm font-medium text-white">{challenge.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/45">{challenge.description}</p>
              <p className="mt-3 text-[11px] text-white/30">
                Categoria: {isKnownCategory(challenge.category) ? CATEGORY_CONTENT[challenge.category].label : challenge.category}
              </p>
              <Link
                href={`/${challenge.category}/forge?challenge=${challenge.id}`}
                className="btn-primary mt-4 w-full py-2 text-xs"
              >
                {challengeDone ? "Refazer o desafio" : "Aceitar desafio"}
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-white/45">Nenhum desafio publicado para hoje. Volte amanhã.</p>
          )}
        </section>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Projetos recentes</h2>
          <Link href="/discover" className="text-xs text-violet-300 hover:text-violet-200">Ver públicos →</Link>
        </div>
        {generations && generations.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generations.map((item) => {
              const meta = isKnownCategory(item.category) ? CATEGORY_CONTENT[item.category] : null;
              const shared = Array.isArray(item.shared_results) ? item.shared_results[0] : item.shared_results;
              return (
                <div key={item.id} className="card flex flex-col p-5">
                  <div className="flex items-center justify-between text-[11px] text-white/35">
                    <span className="chip">{meta?.emoji} {meta?.label ?? item.category}</span>
                    <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1.5 line-clamp-2 flex-1 text-xs text-white/45">{item.summary}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Link href={`/result/${item.id}`} className="btn-secondary px-3 py-1.5 text-[11px]">Abrir</Link>
                    {shared?.slug && <Link href={`/share/${shared.slug}`} className="btn-ghost px-2 py-1.5 text-[11px]">Público ↗</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card mt-4 p-8 text-center">
            <p className="text-sm text-white/50">Você ainda não criou nenhum projeto.</p>
            <Link href="/#categorias" className="btn-primary mt-4 px-5 py-2.5 text-xs">Criar o primeiro</Link>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Seus passes</h2>
            <Link href="/dashboard/passes" className="text-xs text-violet-300">Gerenciar</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {access.isAllAccess ? (
              <span className="chip border-violet-400/40 bg-violet-500/10 text-violet-200">✨ All Access ativo</span>
            ) : access.passes.length ? (
              access.passes.map((pass) => {
                const meta = PASSES.find((item) => item.key === pass);
                return <span key={pass} className="chip">{meta?.emoji} {meta?.label}</span>;
              })
            ) : (
              <p className="text-xs text-white/40">Nenhum passe ativo. O plano Free inclui {PLANS.free.limits.generationsPerDay} gerações/dia.</p>
            )}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white">Conquistas</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BADGES.map((badge) => {
              const earned = earnedKeys.has(badge.key);
              return (
                <div
                  key={badge.key}
                  title={badge.description}
                  className={`rounded-xl border p-2.5 text-center ${earned ? "border-violet-400/30 bg-violet-500/[0.07]" : "border-white/[0.06] bg-white/[0.02] opacity-45"}`}
                >
                  <p className="text-lg" aria-hidden>{badge.emoji}</p>
                  <p className="mt-1 text-[10px] leading-tight text-white/60">{badge.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
