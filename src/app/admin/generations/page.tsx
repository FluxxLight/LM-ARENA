import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Projetos", robots: { index: false, follow: false } };

export default async function AdminGenerationsPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("generations")
    .select("id, title, category, tool, is_public, user_id, remix_of, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-xs text-white/40 hover:text-white">← Admin</Link>
      <h1 className="mt-2 text-xl font-semibold text-white">Projetos recentes</h1>
      <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.07]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-white/[0.03] text-white/40">
            <tr>
              <th className="px-4 py-2.5 font-medium">Título</th>
              <th className="px-4 py-2.5 font-medium">Categoria</th>
              <th className="px-4 py-2.5 font-medium">Ferramenta</th>
              <th className="px-4 py-2.5 font-medium">Dono</th>
              <th className="px-4 py-2.5 font-medium">Público</th>
              <th className="px-4 py-2.5 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-white/60">
            {(data ?? []).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2.5"><Link href={`/result/${row.id}`} className="hover:text-white">{row.title}</Link></td>
                <td className="px-4 py-2.5">{row.category}</td>
                <td className="px-4 py-2.5">{row.tool}</td>
                <td className="px-4 py-2.5">{row.user_id ? "conta" : "visitante"}</td>
                <td className="px-4 py-2.5">{row.is_public ? "sim" : "não"}</td>
                <td className="px-4 py-2.5">{new Date(row.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
