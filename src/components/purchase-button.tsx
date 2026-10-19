"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PurchaseButton({
  planId,
  packId,
  label,
  className,
  disabled,
  notice,
}: {
  planId?: string;
  packId?: string;
  label: string;
  className?: string;
  disabled?: boolean;
  notice?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, packId }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent("/pricing")}`);
        return;
      }
      if (!response.ok) {
        setError(data.error ?? "Não foi possível iniciar o checkout.");
        return;
      }
      router.push(data.url);
    } catch {
      setError("Não foi possível iniciar o checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void start()} disabled={disabled || loading} className={className ?? "btn-primary w-full"}>
        {loading ? "Abrindo…" : label}
      </button>
      {notice && <p className="mt-2 text-[10px] leading-relaxed text-white/30">{notice}</p>}
      {error && <p className="mt-2 text-[11px] text-amber-300">{error}</p>}
    </div>
  );
}
