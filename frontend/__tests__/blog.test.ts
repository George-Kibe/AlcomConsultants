import { expect, test } from "vitest";

import { postJsonLd, readingTime, type PostDetail } from "@/lib/blog";
import { jsonLd } from "@/lib/json-ld";

test("jsonLd can't close the script tag early", () => {
  const out = jsonLd({ name: "</script><script>alert(1)</script>" });
  expect(out).not.toContain("<");
  expect(JSON.parse(out)).toEqual({
    name: "</script><script>alert(1)</script>",
  });
});

test("postJsonLd describes the article", () => {
  const post = {
    title: "Buying land",
    excerpt: "Checks before you pay",
    seo_description: "",
    published_at: "2026-09-30T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    author_name: "Jane Wanjiru",
  } as unknown as PostDetail;
  const ld = postJsonLd(
    post,
    "https://alcom.test/blog/buying-land",
    "https://img/1.jpg",
  );
  expect(ld).toMatchObject({
    "@type": "BlogPosting",
    headline: "Buying land",
    description: "Checks before you pay",
    image: ["https://img/1.jpg"],
    author: { name: "Jane Wanjiru" },
    publisher: { "@type": "Organization" },
  });
  expect(postJsonLd(post, "u")).not.toHaveProperty("image");
  expect(readingTime(4)).toBe("4 min read");
});
