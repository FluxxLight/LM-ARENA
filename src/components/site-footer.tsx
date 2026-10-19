import Link from "next/link";
import { Logo } from "@/components/logo";
import { CATEGORY_LIST } from "@/content";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-black/20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
            Transforme escolhas em ideias. Um motor determinístico que monta projetos completos a partir das suas respostas — sem IA.
          </p>
          <p className="mt-4 text-xs text-white/30">Feito para criadores, estudantes e builders.</p>
        </div>
        <div>
          <p className="section-title mb-3">Categorias</p>
          <ul className="space-y-2 text-sm text-white/55">
            {CATEGORY_LIST.slice(0, 5).map((category) => (
              <li key={category.id}>
                <Link href={`/${category.id}`} className="transition hover:text-white">{category.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="section-title mb-3">Mais</p>
          <ul className="space-y-2 text-sm text-white/55">
            {CATEGORY_LIST.slice(5).map((category) => (
              <li key={category.id}>
                <Link href={`/${category.id}`} className="transition hover:text-white">{category.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="section-title mb-3">Produto</p>
          <ul className="space-y-2 text-sm text-white/55">
            <li><Link href="/discover" className="transition hover:text-white">Descobrir</Link></li>
            <li><Link href="/pricing" className="transition hover:text-white">Passes e preços</Link></li>
            <li><Link href="/dashboard" className="transition hover:text-white">Painel</Link></li>
            <li><Link href="/pricing#faq" className="transition hover:text-white">Perguntas frequentes</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} IDEAForge. Conteúdo gerado por regras, sem inteligência artificial.</p>
          <p>Pagamentos em modo de arquitetura — nenhuma cobrança real é feita.</p>
        </div>
      </div>
    </footer>
  );
}
