import type { Metadata } from "next";
import Link from "next/link";
import { PASSES, PACKS, PLANS, formatPrice } from "@/config/plans";
import { PurchaseButton } from "@/components/purchase-button";
import { paymentsMode } from "@/lib/payments";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Passes e preços",
  description:
    "Nove passes de categoria e o All Access. Ferramentas liberadas, limites maiores e a mesma engine determinística sem IA.",
  alternates: { canonical: "/pricing" },
};

const FAQ = [
  {
    question: "O IDEAForge usa IA?",
    answer:
      "Não. Não há modelo de linguagem, API de IA ou geração probabilística. Os projetos são montados por um motor determinístico com bancos de conteúdo, regras de coerência e templates variáveis.",
  },
  {
    question: "O que acontece no plano gratuito?",
    answer: `Você tem ${PLANS.free.limits.generationsPerDay} gerações por dia, ${PLANS.free.limits.remixesPerDay} remix e ${PLANS.free.limits.sharesPerDay} compartilhamentos. Visitantes sem conta têm um limite próprio e podem salvar o projeto ao criar uma conta.`,
  },
  {
    question: "Um passe libera todas as categorias?",
    answer:
      "Cada passe libera todas as ferramentas de uma categoria, com limites maiores. O All Access libera os nove passes de uma vez.",
  },
  {
    question: "O pagamento é real?",
    answer:
      "A camada de pagamentos está implementada como arquitetura. Nesta instalação o provedor está em modo de simulação: nenhum cartão é solicitado e nenhum valor é cobrado.",
  },
  {
    question: "Posso cancelar?",
    answer:
      "Sim. A função de cancelamento existe na camada de pagamentos e o acesso é controlado por entitlements com data de expiração no servidor.",
  },
];

export default async function PricingPage() {
  const user = await getUser();
  const access = user ? await getAccess(user.id) : null;
  const mode = paymentsMode();
  const mock = mode === "mock";

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip mx-auto">Passes · preços em {PLANS.all_access.currency}</span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Escolha uma categoria. Ou todas.</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
          Os passes liberam as ferramentas especializadas de cada território e aumentam os limites diários. A engine continua a mesma: determinística, reproduzível e sem IA.
        </p>
        {mock && (
          <p className="mx-auto mt-5 max-w-xl rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-100">
            Modo de arquitetura ativo: o checkout é uma simulação. Nenhum valor será cobrado e nenhum dado de cartão é solicitado.
          </p>
        )}
        {!mock && (
          <p className="mx-auto mt-5 max-w-xl rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/50">
            Nenhum provedor de pagamento está conectado nesta instalação. Configure PAYMENT_PROVIDER para habilitar o checkout real.
          </p>
        )}
      </div>

      <section className="mt-12">
        <div className="card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-white">{PLANS.all_access.name}</h2>
                <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-200">Melhor valor</span>
              </div>
              <p className="mt-1 text-sm text-white/50">{PLANS.all_access.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
                <span className="chip">{PLANS.all_access.limits.generationsPerDay} gerações/dia</span>
                <span className="chip">{PLANS.all_access.limits.remixesPerDay} remixes/dia</span>
                <span className="chip">{PLANS.all_access.limits.sharesPerDay} shares/dia</span>
              </div>
            </div>
            <div className="rounded-2xl border border-violet-500/25 bg-black/25 p-5">
              <p className="text-3xl font-semibold text-white">
                {formatPrice(PLANS.all_access.priceCents)}
                <span className="text-sm font-normal text-white/40">/mês</span>
              </p>
              {access?.isAllAccess ? (
                <p className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-center text-xs text-emerald-200">Seu All Access está ativo</p>
              ) : (
                <div className="mt-4">
                  <PurchaseButton
                    planId="all_access"
                    label={user ? "Ativar All Access" : "Entrar para assinar"}
                    notice="Simulação: nenhum valor é cobrado."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PASSES.map((pass) => {
          const plan = PLANS[pass.key];
          const active = Boolean(access?.isAllAccess || access?.features.has(pass.key));
          return (
            <div key={pass.key} className={`card flex flex-col p-5 ${active ? "border-emerald-400/25" : ""}`}>
              <div className="flex items-start justify-between">
                <span className="text-2xl" aria-hidden>{pass.emoji}</span>
                {active && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">Ativo</span>}
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">{pass.label}</h3>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-white/50">{pass.blurb}</p>
              <p className="mt-4 text-2xl font-semibold text-white">
                {formatPrice(plan.priceCents)}
                <span className="text-xs font-normal text-white/40">/mês</span>
              </p>
              <p className="mt-1 text-[11px] text-white/35">{plan.limits.generationsPerDay} gerações · {plan.limits.remixesPerDay} remixes por dia</p>
              <div className="mt-4">
                {active ? (
                  <Link href="/dashboard/passes" className="btn-secondary w-full">Gerenciar</Link>
                ) : (
                  <PurchaseButton
                    planId={pass.key}
                    label={user ? `Ativar ${plan.shortName}` : "Entrar para ativar"}
                    className="btn-secondary w-full"
                  />
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold text-white">Packs de uso</h2>
        <p className="mt-1 text-sm text-white/45">Créditos extras para quem precisa de mais volume em um dia específico.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {PACKS.map((pack) => (
            <div key={pack.id} className="card p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-white">{pack.name}</h3>
                <span className="text-lg font-semibold text-white">{formatPrice(pack.priceCents)}</span>
              </div>
              <p className="mt-1.5 text-xs text-white/45">{pack.description}</p>
              <div className="mt-4">
                <PurchaseButton packId={pack.id} label="Adicionar pack" className="btn-secondary w-full text-xs" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mt-16 scroll-mt-20">
        <h2 className="text-xl font-semibold text-white">Perguntas frequentes</h2>
        <div className="mt-5 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07]">
          {FAQ.map((item) => (
            <details key={item.question} className="group bg-white/[0.02] p-5">
              <summary className="cursor-pointer list-none text-sm font-medium text-white/85">
                <span className="mr-2 text-violet-300 transition group-open:rotate-90 inline-block">›</span>
                {item.question}
              </summary>
              <p className="mt-2.5 pl-5 text-[13px] leading-relaxed text-white/50">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
