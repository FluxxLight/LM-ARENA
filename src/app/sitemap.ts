import type { MetadataRoute } from "next";
import { CATEGORY_LIST } from "@/content";
import { siteUrl } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/discover`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...CATEGORY_LIST.map((category) => ({
      url: `${base}/${category.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("shared_results")
      .select("slug, created_at, generations!inner(is_public)")
      .eq("generations.is_public", true)
      .order("created_at", { ascending: false })
      .limit(200);
    for (const row of data ?? []) {
      entries.push({
        url: `${base}/share/${row.slug}`,
        lastModified: row.created_at ? new Date(row.created_at) : now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // A sitemap must never fail the build because of a transient DB error.
  }

  return entries;
}
