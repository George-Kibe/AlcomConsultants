import type { components } from "@/lib/api/schema";
import { siteConfig } from "@/lib/site-config";

export type PostListItem = components["schemas"]["PostList"];
export type PostDetail = components["schemas"]["PostDetail"];

export const BLOG_PAGE_SIZE = 12;

export function readingTime(minutes: number) {
  return `${minutes} min read`;
}

export function postJsonLd(post: PostDetail, url: string, image?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description || post.excerpt,
    url,
    mainEntityOfPage: url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    ...(image && { image: [image] }),
    author: { "@type": "Person", name: post.author_name },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}/icon.png` },
    },
  };
}
