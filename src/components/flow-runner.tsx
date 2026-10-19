"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnswerMap, CategoryId } from "@/lib/generator/types";

interface FlowOption {
  id: string;
  label: string;
  hint: string | null;
}

interface FlowQuestion {
  index: number;
  total: number;
  id: string;
  prompt: string;
  hint: string | null;
  type: "single" | "multi";
  min: number | null;
  max: number | null;
  priority: number;
  options: FlowOption[];
}

interface FlowRunnerProps {
  category: CategoryId;
  categoryLabel: string;
  categoryEmoji: string;
  toolId: string | null;
  toolLabel: string;
  isGuest: boolean;
  canUseTool: boolean;
  passLabel?: string;
  challengeId?: string | null;
}

type Stage = "loading" | "ready" | "forging";

interface FlowError {
  message: string;
  code?: string;
  pass?: string;
}

export function FlowRunner({
  category,
  categoryLabel,
  categoryEmoji,
  toolId,
  toolLabel,
  isGuest,
  canUseTool,
  passLabel,
  challengeId,
}: FlowRunnerProps) {
  const router = useRouter();
  const [sessionSeed] = useState(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `seed-${Date.now()}`;
  });
  const [questions, setQuestions] = useState<FlowQuestion[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<FlowError | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadFlow = useCallback(
    async (nextAnswers: AnswerMap, moveNext = false) => {
      try {
        const response = await fetch("/api/flow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, tool: toolId, answers: nextAnswers, sessionSeed }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Falha ao carregar perguntas.");
        if (!mounted.current) return;
        const nextQuestions = data.questions as FlowQuestion[];
        setQuestions(nextQuestions);
        setIndex((current) => {
          if (moveNext) return Math.min(current + 1, nextQuestions.length - 1);
          return Math.min(current, Math.max(0, nextQuestions.length - 1));
        });
      } catch (err) {
        if (!mounted.current) return;
        setError({ message: err instanceof Error ? err.message : "Falha ao carregar perguntas." });
      } finally {
        if (mounted.current) setStage("ready");
      }
    },
    [category, toolId, sessionSeed],
  );

  useEffect(() => {
    void loadFlow({});
  }, [loadFlow]);

  const question = questions[index];
  const currentAnswer = question ? answers[question.id] : undefined;
  const selectedIds = currentAnswer ? (Array.isArray(currentAnswer) ? currentAnswer : [currentAnswer]) : [];
  const isLast = questions.length > 0 && index === questions.length - 1;

  function commit(nextAnswers: AnswerMap, advance: boolean) {
    setAnswers(nextAnswers);
    setError(null);
    if (advance) setAdvancing(true);
    void loadFlow(nextAnswers, advance).finally(() => setAdvancing(false));
  }

  function selectOption(optionId: string) {
    if (!question) return;
    let nextAnswers: AnswerMap;
    if (question.type === "single") {
      nextAnswers = { ...answers, [question.id]: optionId };
      commit(nextAnswers, !isLast);
      return;
    }
    const min = question.min ?? 1;
    const max = question.max ?? question.options.length;
    const has = selectedIds.includes(optionId);
    let next = has ? selectedIds.filter((id) => id !== optionId) : [...selectedIds, optionId];
    if (next.length > max) next = next.slice(next.length - max);
    if (!next.length && min > 0) {
      nextAnswers = { ...answers };
      delete nextAnswers[question.id];
    } else {
      nextAnswers = { ...answers, [question.id]: next };
    }
    commit(nextAnswers, false);
  }

  function continueMulti() {
    if (!question) return;
    if (isLast) return;
    setAdvancing(true);
    setTimeout(() => {
      setIndex((current) => Math.min(current + 1, questions.length - 1));
      setAdvancing(false);
    }, 160);
  }

  async function forge() {
    setStage("forging");
    setError(null);
    const started = Date.now();
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, tool: toolId, answers, sessionSeed, challengeId }),
      });
      const data = await response.json();
      const elapsed = Date.now() - started;
      if (elapsed < 900) await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
      if (!response.ok) {
        setError({
          message:
            data.code === "USAGE_LIMIT"
              ? "Você atingiu o limite diário. Crie uma conta gratuita ou libere um passe para continuar."
              : data.code === "PASS_REQUIRED"
                ? "Esta ferramenta faz parte de um passe."
                : (data.error ?? "Não foi possível gerar o projeto."),
          code: data.code,
          pass: data.pass,
        });
        setStage("ready");
        return;
      }
      router.push(`/result/${data.id}`);
    } catch {
      setError({ message: "Não foi possível gerar agora. Tente novamente." });
      setStage("ready");
    }
  }

  if (!canUseTool) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <span className="text-3xl" aria-hidden>🔒</span>
        <h2 className="mt-4 text-lg font-semibold text-white">Ferramenta exclusiva do {passLabel ?? "passe"}</h2>
        <p className="mt-2 text-sm text-white/50">
          {toolLabel} faz parte das ferramentas premium desta categoria. Ative o passe para responder e gerar com ela.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/pricing" className="btn-primary px-5 py-2.5">Ver passes</Link>
          <Link href={`/${category}`} className="btn-secondary px-5 py-2.5">Voltar à categoria</Link>
        </div>
      </div>
    );
  }

  if (stage === "loading" && !questions.length) {
    return (
      <div className="card mx-auto max-w-2xl animate-pulse p-6">
        <div className="h-2 w-24 rounded bg-white/10" />
        <div className="mt-5 h-6 w-3/4 rounded bg-white/10" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-12 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="text-sm text-white/60">{error?.message ?? "Não foi possível carregar o questionário."}</p>
        <button className="btn-secondary mt-4" onClick={() => void loadFlow(answers)}>Tentar novamente</button>
      </div>
    );
  }

  if (stage === "forging") {
    return (
      <div className="card mx-auto max-w-2xl p-10 text-center">
        <div className="forging-ring relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-violet-500/10 text-3xl">
          {categoryEmoji}
        </div>
        <h2 className="mt-6 text-xl font-semibold text-white">Forjando seu projeto…</h2>
        <p className="mt-2 text-sm text-white/50">
          Combinando respostas, regras de coerência e bancos de conteúdo. Sem IA — só o seu perfil de escolhas.
        </p>
        <div className="mx-auto mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-violet-500 to-blue-500 bg-[length:200%_100%]" />
        </div>
      </div>
    );
  }

  const minMulti = question.min ?? 1;
  const multiReady = question.type === "single" || selectedIds.length >= minMulti;
  const progress = Math.round(((index + 1) / paperTotal(questions.length)) * 100);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3 text-xs text-white/45">
        <span className="inline-flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">{categoryEmoji}</span>
          {categoryLabel} · {toolLabel}
        </span>
        <span className="tabular-nums">Pergunta {index + 1} de {questions.length}</span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100">
          <p>{error.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {error.code === "PASS_REQUIRED" && <Link href="/pricing" className="btn-primary px-3 py-1.5 text-xs">Ver passes</Link>}
            {(error.code === "USAGE_LIMIT" || isGuest) && (
              <Link href={`/auth/signup?next=/${category}/forge`} className="btn-secondary px-3 py-1.5 text-xs">
                Criar conta gratuita
              </Link>
            )}
            <Link href="/pricing" className="btn-ghost px-3 py-1.5 text-xs">Ver limites</Link>
          </div>
        </div>
      )}

      <div key={question.id} className="card mt-5 animate-fade-up p-5 sm:p-7">
        <p className="text-lg font-semibold leading-snug text-white sm:text-xl">{question.prompt}</p>
        {question.hint && <p className="mt-1.5 text-sm text-white/45">{question.hint}</p>}
        {question.type === "multi" && (
          <p className="mt-2 text-[11px] uppercase tracking-wider text-violet-300/70">
            Escolha {question.min && question.min > 1 ? `de ${question.min}` : "pelo menos 1"}
            {question.max ? ` a ${question.max}` : ""} · {selectedIds.length} selecionada{selectedIds.length === 1 ? "" : "s"}
          </p>
        )}

        <div className="mt-5 space-y-2.5" role="group" aria-label={question.prompt}>
          {question.options.map((option) => {
            const selected = selectedIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectOption(option.id)}
                disabled={advancing}
                data-selected={selected}
                aria-pressed={selected}
                className="option-card flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:opacity-70"
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border text-[11px] ${
                    question.type === "single" ? "rounded-full" : "rounded-md"
                  } ${selected ? "border-violet-400 bg-violet-500 text-white" : "border-white/20 text-transparent"}`}
                  aria-hidden
                >
                  ✓
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{option.label}</span>
                  {option.hint && <span className="mt-0.5 block text-xs text-white/40">{option.hint}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
            className="btn-ghost px-3 py-2 text-xs"
          >
            ← Voltar
          </button>
          <div className="flex items-center gap-2">
            {question.type === "multi" && !isLast && (
              <button type="button" onClick={continueMulti} disabled={!multiReady} className="btn-primary px-4 py-2 text-xs">
                Continuar
              </button>
            )}
            {isLast ? (
              <button type="button" onClick={() => void forge()} disabled={!multiReady} className="btn-primary px-5 py-2.5">
                🔥 Forjar projeto
              </button>
            ) : (
              question.type === "single" && (
                <button
                  type="button"
                  onClick={() => setIndex((current) => Math.min(current + 1, questions.length - 1))}
                  disabled={!multiReady}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Avançar →
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-white/30">
        {isGuest
          ? "Visitante: 2 projetos por dia. Crie uma conta para salvar, remixar e compartilhar."
          : "Suas respostas ficam vinculadas apenas ao projeto gerado."}
      </p>
    </div>
  );
}

function paperTotal(total: number) {
  return total || 1;
}
