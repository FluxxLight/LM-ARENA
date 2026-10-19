import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ProjectView, projectToText } from "@/components/project-view";
import { ResultActions } from "@/components/result-actions";
import { CopyButton } from "@/components/copy-button";
import { getGenerationForViewer } from "@/lib/generation-access";
import { getUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAccess, hasPass } from "@/lib/access";
import { getTool } from "@/content";
import type { CategoryId } from "@/lib/generator/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await getUser();
  const token = (await cookies()).get("if_guest")?.value ?? null;
  const visible = await getGenerationForViewer(id, user?.id ?? null, token);
  if (!visible) return { title: "Projeto não encontrado", robots: { index: false, follow: false } };
  return {
    title: visible.generation.title,
    description: visible.generation.summary,
    robots: visible.generation.is_public ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const token = (await cookies()).get("if_guest")?.value ?? null;
  const visible = await getGenerationForViewer(id, user?.id ?? null, token);
  if (!visible) notFound();

  const { generation, relation } = visible;
  const project = generation.payload;
  const admin = createSupabaseAdminClient();
  const { data: shared } = await admin
    .from("shared_results")
    .select("slug")
    .eq("generation_id", generation.id)
    .maybeSingle();

  const access = user ? await getAccess(user.id) : null;
  const tool = getTool(generation.category as CategoryId, generation.tool);
  const toolLocked = Boolean(tool && access && !hasPass(access, tool.pass));
  const isOwner = Boolean(user && generation.user_id === user.id);
  const unclaimed = Boolean(user && !generation.user_id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/40">
        <Link href={relation === "public" ? "/discover" : "/dashboard"} className="hover:text-white">
          ← {relation === "public" ? "Descobrir" : "Painel"}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {relation === "guest" && <span className="chip">Projeto de visitante</span>}
          {generation.is_public && shared?.slug && (
            <Link href={`/share/${shared.slug}`} className="chip hover:text-white">Página pública ↗</Link>
          )}
        </div>
      </div>

      <ProjectView project={project} />

      <div className="mt-6">
        {unclaimed ? (
          <ClaimBanner generationId={generation.id} />
        ) : (
          <ResultActions
            project={project}
            generationId={generation.id}
            isOwner={isOwner}
            isAuthenticated={Boolean(user)}
            existingSlug={shared?.slug ?? null}
          />
        )}
      </div>

      {toolLocked && (
        <div className="card mt-4 border-amber-400/25 bg-amber-400/[0.05] p-4 text-sm text-amber-100">
          <p>
            Este projeto usa a ferramenta <strong>{tool?.label}</strong>, que faz parte de um passe. Você pode visualizar e copiar o resultado, mas precisa do passe para remixar com essa ferramenta.
          </p>
          <Link href="/pricing" className="btn-secondary mt-3 px-4 py-2 text-xs">Ver passes</Link>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/35">
        <CopyButton text={projectToText(project)} label="Copiar texto completo" className="btn-ghost px-3 py-2 text-xs" />
        <span>ID {generation.id.slice(0, 8)} · sem IA · conteúdo determinístico</span>
      </div>
    </div>
  );
}

function ClaimBanner({ generationId }: { generationId: string }) {
  return (
    <div className="card border-violet-500/25 bg-violet-500/[0.06] p-5">
      <h2 className="text-base font-semibold text-white">Este projeto ainda é anônimo</h2>
      <p className="mt-1 text-sm text-white/55">
        Ele foi criado antes do login. Vincule à sua conta para salvar no painel, remixar e compartilhar.
      </p>
      <form action={`/api/claim/form?generationId=${generationId}`} method="post" className="mt-4">
        <button type="submit" className="btn-primary px-5 py-2.5">Vincular à minha conta</button>
      </form>
    </div>
  );
}
