"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 40);
}

function sanitizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser("/dashboard/settings");
  const displayName = sanitizeName(String(formData.get("display_name") ?? ""));
  const username = sanitizeUsername(String(formData.get("username") ?? ""));
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();

  if (displayName.length < 2) return { ok: false, message: "O nome precisa ter ao menos 2 caracteres." };
  if (avatarUrl && !/^https:\/\/.+/i.test(avatarUrl)) return { ok: false, message: "Informe uma URL https válida para o avatar." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username: username || null,
      avatar_url: avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, message: "Este nome de usuário já está em uso." };
    return { ok: false, message: "Não foi possível salvar o perfil." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Perfil atualizado." };
}
