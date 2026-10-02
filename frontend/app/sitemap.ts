import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { safely, serverApi } from "@/lib/api/server";
import { locationHref } from "@/lib/seo";
import { services, siteConfig } from "@/lib/site-config";

const STATIC = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/properties", priority: 0.9, changeFrequency: "daily" },
  { path: "/services", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/careers", priority: 0.4, changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
] as const;

/** sitemap.xml, built per request from the live data (demo items are left out). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const url = (path: string) => new URL(path, siteConfig.url).toString();
  const data = (await safely(() => serverApi.GET("/api/v1/seo/sitemap/"))).data;

  return [
    ...STATIC.map((s) => ({
      url: url(s.path),
      priority: s.priority,
      changeFrequency: s.changeFrequency,
    })),
    ...services.map((s) => ({
      url: url(`/services/${s.slug}`),
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...(data?.locations ?? []).map((p) => ({
      url: url(locationHref(p)),
      lastModified: p.updated_at,
      priority: p.kind === "county" ? 0.8 : 0.7,
      changeFrequency: "daily" as const,
    })),
    ...(data?.properties ?? []).map((p) => ({
      url: url(`/properties/${p.slug}`),
      lastModified: p.updated_at,
      priority: 0.7,
      changeFrequency: "weekly" as const,
    })),
    ...(data?.posts ?? []).map((p) => ({
      url: url(`/blog/${p.slug}`),
      lastModified: p.updated_at,
      priority: 0.5,
      changeFrequency: "monthly" as const,
    })),
    ...(data?.jobs ?? []).map((j) => ({
      url: url(`/careers/${j.slug}`),
      lastModified: j.updated_at,
      priority: 0.4,
      changeFrequency: "weekly" as const,
    })),
  ];
}
