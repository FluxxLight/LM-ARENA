import Link from "next/link";
import type { CategoryContent } from "@/lib/generator/types";

export function CategoryCard({ category, index = 0 }: { category: CategoryContent; index?: number }) {
  return (
    <Link
      href={`/${category.id}`}
      className="card card-hover group relative overflow-hidden p-5"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
        style={{ background: `linear-gradient(135deg, ${category.accent[0]}, ${category.accent[1]})` }}
      />
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-xl">
          {category.emoji}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
          {category.tools.length} ferramentas
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{category.label}</h3>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/50">{category.description}</p>
      <p className="mt-4 text-xs font-medium text-violet-300/80 transition group-hover:text-violet-200">
        Começar agora →
      </p>
    </Link>
  );
}
