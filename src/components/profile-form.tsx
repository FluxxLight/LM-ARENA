"use client";

import { useState } from "react";
import { updateProfile } from "@/app/dashboard/settings/actions";

export function ProfileForm({
  displayName,
  username,
  avatarUrl,
}: {
  displayName: string;
  username: string;
  avatarUrl: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function action(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await updateProfile(formData);
    setMessage({ ok: result.ok, text: result.message });
    setLoading(false);
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="display_name">Nome de exibição</label>
        <input id="display_name" name="display_name" defaultValue={displayName} maxLength={40} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="username">Usuário (opcional)</label>
        <input id="username" name="username" defaultValue={username} maxLength={24} className="input" placeholder="seu_usuario" />
      </div>
      <div>
        <label className="label" htmlFor="avatar_url">URL do avatar (https, opcional)</label>
        <input id="avatar_url" name="avatar_url" type="url" defaultValue={avatarUrl} className="input" placeholder="https://..." />
      </div>
      {message && (
        <p className={`rounded-lg border px-3 py-2 text-xs ${message.ok ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200" : "border-amber-400/25 bg-amber-400/[0.07] text-amber-200"}`}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 text-xs">
        {loading ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}
