"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MockConfirm({ planId, packId, session }: { planId?: string; packId?: string; session?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/confirm-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, packId, session }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível concluir a simulação.");
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard/passes?status=success");
        router.refresh();
      }, 900);
    } catch {
      setError("Não foi possível concluir a simulação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <button type="button" onClick={() => void confirm()} disabled={loading || done} className="btn-primary w-full py-3">
        {done ? "Ativado ✓" : loading ? "Processando…" : "Simular ativação"}
      </button>
      {error && <p className="mt-3 text-xs text-amber-300">{error}</p>}
      <p className="mt-3 text-center text-[10px] text-white/30">Evento registrado em payment_events como simulação.</p>
    </div>
  );
}
