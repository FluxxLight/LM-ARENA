import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre para salvar projetos, remixar e acompanhar seu progresso.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <Suspense fallback={<div className="mx-auto h-96 max-w-md animate-pulse rounded-2xl bg-white/[0.03]" />}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
