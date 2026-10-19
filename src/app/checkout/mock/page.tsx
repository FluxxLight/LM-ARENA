import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { paymentsMode } from "@/lib/payments";
import { PLANS, PACKS, formatPrice, type PlanId } from "@/config/plans";
import { MockConfirm } from "@/components/mock-confirm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout simulado",
  robots: { index: false, follow: false },
};

export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; pack?: string; session?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/auth/login?next=/pricing");
  if (paymentsMode() !== "mock") redirect("/pricing");

  const { plan: planParam, pack: packParam, session } = await searchParams;
  const planId = planParam && planParam in PLANS && planParam !== "free" ? (planParam as PlanId) : null;
  const pack = packParam ? PACKS.find((item) => item.id === packParam) ?? null : null;
  if (!planId && !pack) redirect("/pricing");

  const plan = planId ? PLANS[planId] : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="card border-amber-400/25 p-6 sm:p-8">
        <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-200">Ambiente de simulação</span>
        <h1 className="mt-4 text-2xl font-semibold text-white">Confirmar ativação</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Nenhum provedor de pagamento real está conectado. Esta etapa existe para validar a arquitetura de checkout,
          entitlements e assinaturas. Nenhum valor será cobrado.
        </p>

        <div className="mt-6 rounded-xl border border-white/[0.07] bg-black/25 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/50">{plan ? "Passe" : "Pack"}</span>
            <span className="font-medium text-white">{plan?.name ?? pack?.name}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-white/50">Valor simulado</span>
            <span className="text-white/70">{formatPrice(plan?.priceCents ?? pack?.priceCents ?? 0)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-white/50">Cobrança real</span>
            <span className="font-medium text-emerald-300">R$ 0,00</span>
          </div>
        </div>

        <MockConfirm planId={planId ?? undefined} packId={pack?.id} session={session} />

        <Link href="/pricing" className="mt-4 block text-center text-xs text-white/40 hover:text-white">Cancelar e voltar</Link>
      </div>
    </div>
  );
}
