import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PLANS, PASSES, formatPrice } from "@/config/plans";
import { paymentsMode } from "@/lib/payments";
import { CancelButton } from "@/components/cancel-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meus passes",
  robots: { index: false, follow: false },
};

export default async function PassesPage() {
  const user = await requireUser("/dashboard/passes");
  const access = await getAccess(user.id);
  const supabase = await createSupabaseServerClient();

  const [{ data: entitlements }, { data: subscriptions }, { data: events }] = await Promise.all([
    supabase.from("entitlements").select("feature_key, source, expires_at, created_at").eq("user_id", user.id),
    supabase.from("subscriptions").select("id, plan_id, provider, status, current_period_end, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("payment_events").select("id, event_type, status, amount_cents, created_at, provider").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
  ]);

  const mode = paymentsMode();
  const activeSubscription = (subscriptions ?? []).find((row) => row.status === "active");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-xs text-white/40 hover:text-white">← Painel</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Meus passes</h1>
        </div>
        <Link href="/pricing" className="btn-primary px-4 py-2 text-xs">Ver catálogo</Link>
      </div>

      {mode === "mock" && (
        <p className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-100">
          Ambiente de simulação: ativações e cancelamentos aqui não movimentam dinheiro real.
        </p>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="card p-5">
          <p className="section-title">Plano atual</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {access.isAllAccess ? "All Access" : access.passes[0] ? PLANS[access.passes[0] as keyof typeof PLANS]?.name ?? access.passes[0] : "Free"}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {access.limits.generationsPerDay} gerações · {access.limits.remixesPerDay} remixes · {access.limits.sharesPerDay} shares por dia
          </p>
          {activeSubscription && (
            <p className="mt-3 text-[11px] text-white/35">
              Assinatura {activeSubscription.provider} · até {activeSubscription.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString("pt-BR") : "—"}
            </p>
          )}
        </div>
        <div className="card p-5">
          <p className="section-title">Passes ativos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {access.isAllAccess ? (
              <span className="chip border-violet-400/40 bg-violet-500/10 text-violet-200">✨ All Access</span>
            ) : access.passes.length ? (
              access.passes.map((pass) => {
                const meta = PASSES.find((item) => item.key === pass);
                return <span key={pass} className="chip">{meta?.emoji} {meta?.label}</span>;
              })
            ) : (
              <p className="text-xs text-white/40">Nenhum passe ativo.</p>
            )}
          </div>
          {activeSubscription && (
            <div className="mt-4">
              <CancelButton />
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PASSES.map((pass) => {
          const plan = PLANS[pass.key];
          const active = access.isAllAccess || access.features.has(pass.key);
          return (
            <div key={pass.key} className={`card p-4 ${active ? "border-emerald-400/25" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-xl" aria-hidden>{pass.emoji}</span>
                <span className={`text-[10px] uppercase tracking-wider ${active ? "text-emerald-300" : "text-white/30"}`}>
                  {active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{pass.label}</p>
              <p className="mt-1 text-[11px] text-white/40">{formatPrice(plan.priceCents)}/mês</p>
              {!active && <Link href="/pricing" className="mt-3 inline-block text-xs text-violet-300">Ativar →</Link>}
            </div>
          );
        })}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-white">Histórico de entitlements</h2>
        {entitlements && entitlements.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-white/40">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Recurso</th>
                  <th className="px-4 py-2.5 font-medium">Origem</th>
                  <th className="px-4 py-2.5 font-medium">Expira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-white/60">
                {entitlements.map((entry) => (
                  <tr key={`${entry.feature_key}-${entry.created_at}`}>
                    <td className="px-4 py-2.5">{entry.feature_key}</td>
                    <td className="px-4 py-2.5">{entry.source}</td>
                    <td className="px-4 py-2.5">{entry.expires_at ? new Date(entry.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-xs text-white/40">Nenhum entitlement registrado ainda.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-white">Eventos de pagamento</h2>
        {events && events.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {events.map((event) => (
              <li key={event.id} className="card flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs">
                <span className="text-white/60">{event.event_type} · {event.provider}</span>
                <span className="text-white/35">{new Date(event.created_at).toLocaleString("pt-BR")}</span>
                <span className="text-emerald-300">{event.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-white/40">Nenhum evento registrado. Nenhuma cobrança foi feita.</p>
        )}
      </section>
    </div>
  );
}
