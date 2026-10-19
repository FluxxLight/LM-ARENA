"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copiar resultado", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className ?? "btn-secondary px-4 py-2 text-xs"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copiado ✓" : label}
    </button>
  );
}
