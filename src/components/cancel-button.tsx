"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelMockSubscription } from "@/app/dashboard/passes/actions";

export function CancelButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm("Cancelar a assinatura simulada? O passe permanece ativo até a data de expiração.")) return;
    setLoading(true);
    const result = await cancelMockSubscription();
    setMessage(result.message);
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <button type="button" onClick={() => void cancel()} disabled={loading} className="btn-ghost px-3 py-2 text-xs">
        {loading ? "Cancelando…" : "Cancelar assinatura"}
      </button>
      {message && <p className="mt-2 text-[11px] text-white/45">{message}</p>}
    </div>
  );
}
