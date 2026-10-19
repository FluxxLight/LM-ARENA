import type { GeneratedProject } from "@/lib/generator/types";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="section-title">{label}</p>
      <div className="mt-2 text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  );
}

export function ProjectView({ project }: { project: GeneratedProject }) {
  const labels = project.sectionLabels;
  const answerEntries = Object.entries(project.answerLabels).filter(([, values]) => values.length > 0);

  return (
    <article className="space-y-6">
      <header className="card relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: `linear-gradient(135deg, ${project.palette[0]}, ${project.palette[1]})` }}
        />
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="chip">{project.emoji} {project.categoryLabel}</span>
          <span className="chip">{project.toolLabel}</span>
          <span className="chip">Seed {project.seed.slice(0, 8)}</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{project.name}</h1>
        <p className="mt-2 text-base text-violet-200/80">{project.tagline}</p>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/60">{project.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {project.tags.slice(0, 8).map((tag) => (
            <span key={tag} className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] text-white/45">#{tag}</span>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5 sm:p-6"><Section label={labels.concept}>{project.concept}</Section></div>
        <div className="card p-5 sm:p-6"><Section label={labels.audience}>{project.audience}</Section></div>
        <div className="card p-5 sm:p-6">
          <Section label={labels.features}>
            <ul className="space-y-2">
              {project.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="mt-0.5 text-violet-400" aria-hidden>◆</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <div className="card p-5 sm:p-6">
          <Section label={labels.coreMechanic}>{project.coreMechanic}</Section>
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <Section label={labels.progression}>{project.progression}</Section>
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <Section label={labels.roadmap}>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2">
            {project.roadmap.map((phase, index) => (
              <li key={`${phase.title}-${index}`} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">Fase {index + 1}</span>
                  <span className="text-[10px] text-white/35">{phase.timeframe}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-white">{phase.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/50">{phase.description}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <Section label={labels.highlights}>
            <ul className="space-y-2">
              {project.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2">
                  <span className="mt-0.5 text-emerald-400" aria-hidden>✓</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <div className="card p-5 sm:p-6">
          <Section label={labels.monetization}>{project.monetization}</Section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <Section label={labels.risks}>
            <ul className="space-y-2">
              {project.risks.map((risk) => (
                <li key={risk} className="flex gap-2">
                  <span className="mt-0.5 text-amber-400" aria-hidden>!</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <div className="card p-5 sm:p-6">
          <Section label={labels.nextSteps}>
            <ol className="space-y-2">
              {project.nextSteps.map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span className="text-violet-300">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>

      {project.extras.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {project.extras.map((extra) => (
            <div key={extra.title} className="card p-5 sm:p-6">
              <Section label={extra.title}>
                <ul className="space-y-2">
                  {extra.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-0.5 text-blue-400" aria-hidden>→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          ))}
        </div>
      )}

      {answerEntries.length > 0 && (
        <details className="card group p-5 sm:p-6">
          <summary className="cursor-pointer list-none text-sm font-medium text-white/70">
            <span className="section-title inline">Suas escolhas</span>
            <span className="ml-2 text-white/30 group-open:hidden">({answerEntries.length})</span>
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {answerEntries.map(([questionId, values]) => (
              <div key={questionId} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-white/30">{questionId}</p>
                <p className="mt-0.5 text-xs text-white/60">{values.join(" · ")}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <footer className="card flex flex-wrap items-center justify-between gap-3 p-4 text-[11px] text-white/35">
        <span>
          Gerado em {new Date(project.createdAt).toLocaleDateString("pt-BR")} · {project.meta.questionCount} perguntas · combinações:{" "}
          {new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(project.meta.combinationSpace)}
        </span>
        <span>engine {project.meta.engine} · sem IA</span>
      </footer>
    </article>
  );
}

export function projectToText(project: GeneratedProject): string {
  const labels = project.sectionLabels;
  const lines: string[] = [
    project.name,
    project.tagline,
    "",
    project.summary,
    "",
    `${labels.concept}: ${project.concept}`,
    `${labels.audience}: ${project.audience}`,
    "",
    `${labels.features}:`,
    ...project.features.map((item) => `- ${item}`),
    "",
    `${labels.coreMechanic}: ${project.coreMechanic}`,
    `${labels.progression}: ${project.progression}`,
    `${labels.monetization}: ${project.monetization}`,
    "",
    `${labels.roadmap}:`,
    ...project.roadmap.map((phase, index) => `${index + 1}. ${phase.title} — ${phase.description}`),
    "",
    `${labels.highlights}:`,
    ...project.highlights.map((item) => `- ${item}`),
    "",
    `${labels.risks}:`,
    ...project.risks.map((item) => `- ${item}`),
    "",
    `${labels.nextSteps}:`,
    ...project.nextSteps.map((item, index) => `${index + 1}. ${item}`),
  ];
  for (const extra of project.extras) {
    lines.push("", `${extra.title}:`, ...extra.items.map((item) => `- ${item}`));
  }
  lines.push("", "Criado no IDEAForge — motor determinístico, sem IA");
  return lines.join("\n");
}
