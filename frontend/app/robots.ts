import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

// Only production is indexable; staging and development are hidden from search engines.
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NEXT_PUBLIC_SITE_ENV === "production";
  return {
    rules: isProduction
      ? { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/"] }
      : { userAgent: "*", disallow: "/" },
    host: siteConfig.url,
  };
}
