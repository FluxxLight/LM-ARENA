import type { Metadata } from "next";
import Link from "next/link";
import { requireUser, getProfile, displayName } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurações",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const profile = await getProfile(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/dashboard" className="text-xs text-white/40 hover:text-white">← Painel</Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Configurações</h1>
      <p className="mt-1 text-sm text-white/45">Seu perfil público nos projetos compartilhados mostra apenas o nome de exibição.</p>

      <div className="card mt-6 p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white">
            {displayName(user, profile).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-medium text-white">{displayName(user, profile)}</p>
            <p className="text-xs text-white/40">{user.email}</p>
          </div>
        </div>
        <div className="mt-6">
          <ProfileForm
            displayName={profile?.display_name ?? ""}
            username={profile?.username ?? ""}
            avatarUrl={profile?.avatar_url ?? ""}
          />
        </div>
      </div>

      <div className="card mt-4 p-6">
        <h2 className="text-sm font-semibold text-white">Conta e segurança</h2>
        <ul className="mt-3 space-y-2 text-xs text-white/50">
          <li>E-mail: {user.email}</li>
          <li>Último acesso: {new Date(user.last_sign_in_at ?? Date.now()).toLocaleString("pt-BR")}</li>
          <li>Sessão persistente gerenciada pelo Supabase Auth com cookies httpOnly.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/auth/forgot-password" className="btn-secondary px-4 py-2 text-xs">Redefinir senha por e-mail</Link>
          <form action="/auth/logout" method="post">
            <button type="submit" className="btn-ghost px-4 py-2 text-xs">Sair da conta</button>
          </form>
        </div>
      </div>
    </div>
  );
}
