import { z } from "zod";

import type { components } from "@/lib/api/schema";

export type DashboardPost = components["schemas"]["DashboardPost"];

export const postSchema = z.object({
  title: z.string().trim().min(3, "Give the article a title.").max(150),
  body: z.string(),
  excerpt: z.string().trim().max(300, "Keep the summary under 300 characters."),
  cover_alt: z.string().trim().max(200),
  slug: z.string().trim().max(120),
  seo_title: z.string().trim().max(70, "Max 70 characters."),
  seo_description: z.string().trim().max(160, "Max 160 characters."),
});

export type PostFormValues = z.infer<typeof postSchema>;

export const emptyPost: PostFormValues = {
  title: "",
  body: "",
  excerpt: "",
  cover_alt: "",
  slug: "",
  seo_title: "",
  seo_description: "",
};

export function postFromApi(post: DashboardPost): PostFormValues {
  return {
    title: post.title,
    body: post.body ?? "",
    excerpt: post.excerpt ?? "",
    cover_alt: post.cover_alt ?? "",
    slug: post.slug ?? "",
    seo_title: post.seo_title ?? "",
    seo_description: post.seo_description ?? "",
  };
}

/** Request body; an empty slug on a new post lets the server derive it from the title. */
export function postPayload(values: PostFormValues, isNew: boolean) {
  const { slug, ...rest } = values;
  return isNew && !slug ? rest : values;
}
