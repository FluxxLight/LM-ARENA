import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Pagamentos", robots: { index: false, follow: false } };

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("payment_events")
    .select("id, event_type, provider, status, amount_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-xs text-white/40 hover:text-white">← Admin</Link>
      <h1 className="mt-2 text-xl font-semibold text-white">Eventos de pagamento</h1>
      <p className="mt-1 text-xs text-white/40">Inclui eventos simulados do provedor mock. Nenhuma cobrança real é registrada sem gateway conectado.</p>
      <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.07]">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-white/[0.03] text-white/40">
            <tr>
              <th className="px-4 py-2.5 font-medium">Evento</th>
              <th className="px-4 py-2.5 font-medium">Provedor</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Valor</th>
              <th className="px-4 py-2.5 font-medium">Quando</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-white/60">
            {(data ?? []).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2.5">{row.event_type}</td>
                <td className="px-4 py-2.5">{row.provider}</td>
                <td className="px-4 py-2.5">{row.status}</td>
                <td className="px-4 py-2.5">{row.amount_cents ? (row.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "simulado"}</td>
                <td className="px-4 py-2.5">{new Date(row.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
