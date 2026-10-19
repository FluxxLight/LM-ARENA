import Link from "next/link";
import { Logo } from "@/components/logo";
import { getUser, getProfile, displayName } from "@/lib/auth";
import { CATEGORY_LIST } from "@/content";

export async function SiteHeader() {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  const name = user ? displayName(user, profile) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07070b]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            <div className="group relative">
              <button className="btn-ghost px-3 py-2 text-[13px]" type="button">
                Categorias <span className="text-white/40">▾</span>
              </button>
              <div className="invisible absolute left-0 top-full z-50 w-64 rounded-2xl border border-white/10 bg-ink-850 p-2 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                {CATEGORY_LIST.map((category) => (
                  <Link
                    key={category.id}
                    href={`/${category.id}`}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <span aria-hidden>{category.emoji}</span> {category.label}
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/discover" className="btn-ghost px-3 py-2 text-[13px]">Descobrir</Link>
            <Link href="/pricing" className="btn-ghost px-3 py-2 text-[13px]">Passes</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:text-white sm:flex">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[10px] font-bold text-white">
                  {name?.slice(0, 2).toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate">{name}</span>
              </Link>
              <Link href="/dashboard" className="btn-secondary px-3 py-2 text-[13px] sm:hidden">Painel</Link>
              <form action="/auth/logout" method="post">
                <button className="btn-ghost px-2.5 py-2 text-[13px]" type="submit">Sair</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost px-3 py-2 text-[13px]">Entrar</Link>
              <Link href="/auth/signup" className="btn-primary px-3.5 py-2 text-[13px]">Criar conta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
