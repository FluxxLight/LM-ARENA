import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface Profile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  plan_id: string;
  xp: number;
  streak_days: number;
  last_active_on: string | null;
  created_at: string;
}

export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, role, plan_id, xp, streak_days, last_active_on, created_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function requireUser(nextPath = "/dashboard"): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser("/admin");
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "admin") redirect("/dashboard?error=admin_only");
  return user;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin";
}

export function displayName(user: User, profile?: Profile | null): string {
  return profile?.display_name || user.email?.split("@")[0] || "Explorer";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "IF";
}
