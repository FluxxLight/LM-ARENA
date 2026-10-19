"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GeneratedProject, RemixMode } from "@/lib/generator/types";
import { projectToText } from "@/components/project-view";
import { REMIX_MODE_LIST as REMIX_MODES } from "@/config/remix";

interface ResultActionsProps {
  project: GeneratedProject;
  generationId: string;
  isOwner: boolean;
  isAuthenticated: boolean;
  existingSlug: string | null;
}

export function ResultActions({ project, generationId, isOwner, isAuthenticated, existingSlug }: ResultActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState<"result" | "link" | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(
    existingSlug ? `/share/${existingSlug}` : null,
  );
  const [shareError, setShareError] = useState<string | null>(null);
  const [remixError, setRemixError] = useState<string | null>(null);
  const [remixing, setRemixing] = useState<RemixMode | null>(null);
  const [sharing, setSharing] = useState(false);
  const [, startTransition] = useTransition();

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(projectToText(project));
      setCopied("result");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setRemixError("Não foi possível copiar. Selecione o texto manualmente.");
    }
  }

  async function share() {
    setSharing(true);
    setShareError(null);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setShareError(
          data.code === "USAGE_LIMIT"
            ? "Limite diário de compartilhamentos atingido."
            : (data.error ?? "Não foi possível compartilhar."),
        );
        return;
      }
      const path = data.path as string;
      setShareUrl(path);
      const absolute = `${window.location.origin}${path}`;
      try {
        await navigator.clipboard.writeText(absolute);
      } catch {
        /* clipboard is optional */
      }
      startTransition(() => router.refresh());
    } catch {
      setShareError("Não foi possível compartilhar agora.");
    } finally {
      setSharing(false);
    }
  }

  async function remix(mode: RemixMode) {
    setRemixing(mode);
    setRemixError(null);
    try {
      const response = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId, mode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRemixError(
          data.code === "USAGE_LIMIT"
            ? "Limite diário de remixes atingido. Veja os passes para liberar mais."
            : (data.error ?? "Não foi possível remixar."),
        );
        return;
      }
      router.push(`/result/${data.id}`);
    } catch {
      setRemixError("Não foi possível remixar agora.");
    } finally {
      setRemixing(null);
    }
  }

  const shareAbsolute = shareUrl && typeof window !== "undefined" ? `${window.location.origin}${shareUrl}` : shareUrl;
  const whatsapp = shareAbsolute ? `https://wa.me/?text=${encodeURIComponent(`${project.name} — criado no IDEAForge\n${shareAbsolute}`)}` : null;

  if (!isAuthenticated) {
    return (
      <div className="card border-violet-500/25 bg-violet-500/[0.06] p-5 sm:p-6">
        <h2 className="text-base font-semibold text-white">Salve este projeto na sua conta</h2>
        <p className="mt-1.5 text-sm text-white/55">
          Crie uma conta gratuita para guardar no painel, remixar em quatro modos, compartilhar e acumular XP.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href={`/auth/signup?next=${encodeURIComponent(`/result/${generationId}`)}&claim=${generationId}`} className="btn-primary px-5 py-2.5">
            Criar conta e salvar
          </Link>
          <Link href={`/auth/login?next=${encodeURIComponent(`/result/${generationId}`)}&claim=${generationId}`} className="btn-secondary px-5 py-2.5">
            Já tenho conta
          </Link>
          <button type="button" onClick={() => void copyResult()} className="btn-ghost px-5 py-2.5">
            {copied === "result" ? "Copiado ✓" : "Copiar resultado"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Ações do projeto</h2>
            <p className="mt-0.5 text-xs text-white/40">
              Remix mantém a categoria. Compartilhar publica apenas o projeto — nunca seu e-mail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyResult()} className="btn-secondary px-4 py-2 text-xs">
              {copied === "result" ? "Copiado ✓" : "Copiar resultado"}
            </button>
            {isOwner ? (
              <button type="button" onClick={() => void share()} disabled={sharing} className="btn-primary px-4 py-2 text-xs">
                {sharing ? "Publicando…" : shareUrl ? "Compartilhar novamente" : "Compartilhar"}
              </button>
            ) : (
              <button type="button" onClick={() => void share()} disabled={sharing} className="btn-secondary px-4 py-2 text-xs">
                {sharing ? "Publicando…" : "Compartilhar também"}
              </button>
            )}
          </div>
        </div>

        {shareUrl && (
          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
            <p className="text-xs font-medium text-emerald-200">Link público pronto</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={shareAbsolute ?? shareUrl} className="input flex-1 text-xs" aria-label="Link público" />
              <a href={whatsapp ?? "#"} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-2 text-xs">
                WhatsApp
              </a>
              <button
                type="button"
                onClick={() => {
                  if (shareAbsolute) void navigator.clipboard.writeText(shareAbsolute);
                  setCopied("link");
                  setTimeout(() => setCopied(null), 2000);
                }}
                className="btn-secondary px-3 py-2 text-xs"
              >
                {copied === "link" ? "Copiado ✓" : "Copiar link"}
              </button>
            </div>
          </div>
        )}
        {shareError && <p className="mt-3 text-xs text-amber-300">{shareError}</p>}
      </div>

      {isOwner && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-white">Remixar</h2>
          <p className="mt-0.5 text-xs text-white/40">Quatro modos, do ajuste fino à reinvenção total.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {REMIX_MODES.map((mode) => (
              <button
                key={mode.mode}
                type="button"
                onClick={() => void remix(mode.mode)}
                disabled={remixing !== null}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-violet-400/50 hover:bg-violet-500/[0.06] disabled:opacity-60"
              >
                <span className="text-xs font-semibold text-white">
                  {remixing === mode.mode ? "Remixando…" : mode.label}
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-white/40">{mode.description}</span>
              </button>
            ))}
          </div>
          {remixError && <p className="mt-3 text-xs text-amber-300">{remixError}</p>}
        </div>
      )}
    </div>
  );
}
