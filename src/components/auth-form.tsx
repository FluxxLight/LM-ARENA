"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot" | "reset";

const COPY: Record<Mode, { title: string; subtitle: string; action: string; busy: string }> = {
  login: { title: "Entrar", subtitle: "Acesse seu painel, projetos e passes.", action: "Entrar", busy: "Entrando…" },
  signup: { title: "Criar conta", subtitle: "Grátis. 5 gerações por dia e projetos salvos no painel.", action: "Criar conta", busy: "Criando…" },
  forgot: { title: "Recuperar senha", subtitle: "Enviaremos um link para redefinir sua senha.", action: "Enviar link", busy: "Enviando…" },
  reset: { title: "Nova senha", subtitle: "Defina uma senha nova para sua conta.", action: "Salvar senha", busy: "Salvando…" },
};

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const claim = searchParams.get("claim");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const copy = COPY[mode];

  async function claimProject() {
    if (!claim) return;
    try {
      await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: claim }),
      });
    } catch {
      /* claiming is best-effort; the result page offers a manual link */
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw new Error(translate(signInError.message));
        await claimProject();
        router.push(next);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}${claim ? `&claim=${claim}` : ""}`,
          },
        });
        if (signUpError) throw new Error(translate(signUpError.message));
        if (!data.session) {
          setMessage("Conta criada. Confirme o e-mail para ativar o acesso e salvar o projeto.");
          return;
        }
        await claimProject();
        router.push(next);
        router.refresh();
        return;
      }

      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
        });
        if (resetError) throw new Error(translate(resetError.message));
        setMessage("Se este e-mail estiver cadastrado, você receberá um link de recuperação em instantes.");
        return;
      }

      if (mode === "reset") {
        if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw new Error(translate(updateError.message));
        setMessage("Senha atualizada. Redirecionando…");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{copy.title}</h1>
        <p className="mt-1.5 text-sm text-white/50">{copy.subtitle}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode !== "reset" && (
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input"
                placeholder="voce@exemplo.com"
              />
            </div>
          )}
          {mode !== "forgot" && (
            <div>
              <label className="label" htmlFor="password">{mode === "reset" ? "Nova senha" : "Senha"}</label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input"
                placeholder="Mínimo de 6 caracteres"
              />
            </div>
          )}

          {error && <p className="rounded-lg border border-red-400/25 bg-red-400/[0.07] px-3 py-2 text-xs text-red-200">{error}</p>}
          {message && <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2 text-xs text-emerald-200">{message}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? copy.busy : copy.action}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-xs text-white/45">
          {mode === "login" && (
            <>
              <p>Não tem conta? <Link href={`/auth/signup?next=${encodeURIComponent(next)}`} className="text-violet-300 hover:text-violet-200">Criar conta</Link></p>
              <p><Link href="/auth/forgot-password" className="hover:text-white">Esqueci minha senha</Link></p>
            </>
          )}
          {mode === "signup" && (
            <p>Já tem conta? <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="text-violet-300 hover:text-violet-200">Entrar</Link></p>
          )}
          {mode === "forgot" && (
            <p><Link href="/auth/login" className="hover:text-white">Voltar para o login</Link></p>
          )}
        </div>
      </div>
      {claim && (
        <p className="mt-4 text-center text-xs text-white/35">
          O projeto criado como visitante será vinculado à sua conta após entrar.
        </p>
      )}
    </div>
  );
}

function translate(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha inválidos.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
    "User already registered": "Este e-mail já está cadastrado. Tente entrar.",
    "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
    "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
    "For security purposes, you can only request this once every 60 seconds": "Aguarde 60 segundos antes de solicitar novamente.",
  };
  return map[message] ?? message;
}
