import Link from "next/link";
import { CATEGORY_LIST } from "@/content";
import { CategoryCard } from "@/components/category-card";
import { PLANS, formatPrice, PASSES } from "@/config/plans";
import { combinationSpace } from "@/lib/generator/questions";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Escolha uma categoria",
    text: "Nove territórios criativos, do game design ao plano de carreira. Cada um com ferramentas próprias.",
  },
  {
    title: "Responda de 8 a 18 perguntas",
    text: "Perguntas adaptativas: algumas só aparecem depois de uma escolha específica. Sem digitar prompt.",
  },
  {
    title: "Receba um projeto completo",
    text: "Conceito, público, mecânicas, monetização, roadmap e próximos passos. Tudo montado por regras.",
  },
  {
    title: "Salve, remixe e compartilhe",
    text: "Crie uma conta para guardar no painel, remixar em quatro modos e publicar na galeria Descobrir.",
  },
];

export default async function HomePage() {
  const user = await getUser();
  const totalTools = CATEGORY_LIST.reduce((acc, category) => acc + category.tools.length, 0);
  const totalQuestions = CATEGORY_LIST.reduce((acc, category) => acc + category.questions.length, 0);
  const space = CATEGORY_LIST.reduce((acc, category) => acc + combinationSpace(category.id), 0);
  const spaceLabel = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(space);
  const featured = CATEGORY_LIST.slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-220px] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute right-[-140px] top-40 h-[360px] w-[360px] rounded-full bg-blue-600/15 blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="chip mx-auto animate-fade-up">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Motor determinístico · 100% sem IA
            </span>
            <h1 className="mt-6 animate-fade-up text-balance text-4xl font-semibold leading-[1.06] tracking-tight sm:text-6xl">
              <span className="gradient-text">IDEAForge</span>
              <span className="mt-2 block text-white/90">Transforme escolhas em ideias.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl animate-fade-up text-pretty text-base leading-relaxed text-white/55 sm:text-lg">
              Escolha uma categoria, responda perguntas e receba um projeto completo — coerente, reproduzível e pronto para começar. Sem prompts, sem modelos de linguagem, sem achismo.
            </p>
            <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={user ? "/dashboard" : "#categorias"} className="btn-primary w-full px-6 py-3 text-[15px] sm:w-auto">
                COMEÇAR AGORA <span aria-hidden>→</span>
              </Link>
              <Link href="/discover" className="btn-secondary w-full px-6 py-3 text-[15px] sm:w-auto">
                Ver projetos públicos
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/35">
              Sem cartão para começar. Visitantes criam 2 projetos por dia.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: "9", label: "categorias" },
              { value: String(totalTools), label: "ferramentas" },
              { value: String(totalQuestions), label: "perguntas" },
              { value: `${spaceLabel}+`, label: "combinações" },
            ].map((stat) => (
              <div key={stat.label} className="card px-4 py-3 text-center">
                <p className="text-lg font-semibold text-white">{stat.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-4xl animate-fade-up">
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-2 text-[11px] text-white/35">ideaforge · forja em andamento</span>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-[1.1fr_1fr] sm:p-6">
                <div className="space-y-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">Pergunta 4 de 11</p>
                  <p className="text-lg font-medium text-white">Qual é a fantasia central do jogador?</p>
                  {[
                    { label: "Dominar um sistema que ninguém entende", active: true },
                    { label: "Construir algo que sobrevive a você", active: false },
                    { label: "Escapar de um lugar que te prende", active: false },
                  ].map((option) => (
                    <div
                      key={option.label}
                      className={`rounded-xl border px-3.5 py-3 text-sm ${
                        option.active
                          ? "border-violet-500/70 bg-violet-500/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-white/55"
                      }`}
                    >
                      {option.label}
                    </div>
                  ))}
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-black/25 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">Resultado</p>
                  <p className="mt-2 text-sm font-semibold text-white">Hollow Circuit</p>
                  <p className="mt-1 text-xs text-white/50">RPG tático sobre reparar uma cidade quebrada.</p>
                  <div className="mt-4 space-y-2 text-[11px] text-white/45">
                    <p className="flex justify-between"><span>Conceito</span><span className="text-emerald-400">pronto</span></p>
                    <p className="flex justify-between"><span>Mecânica</span><span className="text-emerald-400">pronto</span></p>
                    <p className="flex justify-between"><span>Roadmap</span><span className="text-emerald-400">5 fases</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="categorias" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-title">Escolha seu território</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Nove categorias. {totalTools} ferramentas.</h2>
          </div>
          <Link href="/pricing" className="text-sm text-violet-300 hover:text-violet-200">Ver passes →</Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_LIST.slice(6).map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
          <Link href="/discover" className="card card-hover flex flex-col justify-between p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-xl">🌍</span>
            <div>
              <h3 className="mt-4 text-base font-semibold text-white">Descobrir</h3>
              <p className="mt-1.5 text-[13px] text-white/50">Projetos públicos criados por outras pessoas.</p>
              <p className="mt-4 text-xs font-medium text-violet-300/80">Explorar galeria →</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="section-title">Como funciona</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Quatro passos. Zero prompts.</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
              O motor combina suas respostas com bancos de conteúdo, regras de coerência e templates variáveis. O mesmo conjunto de escolhas gera o mesmo projeto — e pequenas mudanças geram resultados diferentes.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Determinístico", "Reprodutível", "Sem IA", "Sem API externa"].map((tag) => (
                <span key={tag} className="chip">{tag}</span>
              ))}
            </div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step.title} className="card p-5">
                <span className="text-xs font-semibold text-violet-300">0{index + 1}</span>
                <h3 className="mt-2 text-sm font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="card relative overflow-hidden p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="section-title">Passes</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Um passe por categoria. Ou tudo de uma vez.</h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/50">
                O plano gratuito inclui {PLANS.free.limits.generationsPerDay} gerações por dia. Cada passe libera todas as ferramentas da categoria com limites maiores.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {PASSES.slice(0, 5).map((pass) => (
                  <span key={pass.key} className="chip">{pass.emoji} {pass.label}</span>
                ))}
                <span className="chip">+4 passes</span>
              </div>
            </div>
            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-5">
              <p className="text-xs uppercase tracking-wider text-violet-200/70">All Access</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {formatPrice(PLANS.all_access.priceCents)}
                <span className="text-sm font-normal text-white/40">/mês</span>
              </p>
              <p className="mt-1 text-xs text-white/45">Todos os passes, todas as ferramentas.</p>
              <Link href="/pricing" className="btn-primary mt-5 w-full">Ver todos os passes</Link>
              <p className="mt-3 text-center text-[10px] text-white/30">Camada de pagamento em modo de arquitetura.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sua próxima ideia está a 8 perguntas de distância.</h2>
          <p className="max-w-lg text-sm text-white/50">Escolha um território e comece. Você pode salvar depois — o projeto fica vinculado à sua conta quando você entrar.</p>
          <Link href="#categorias" className="btn-primary px-6 py-3">COMEÇAR AGORA</Link>
        </div>
      </section>
    </>
  );
}
