import type { Metadata } from "next";

import { PageHeader } from "@/components/site/page-header";
import { Pagination } from "@/components/site/pagination";
import { PostCard } from "@/components/site/post-card";
import { safely, serverApi } from "@/lib/api/server";
import { BLOG_PAGE_SIZE } from "@/lib/blog";
import { siteConfig } from "@/lib/site-config";

const INTRO =
  "Guides and insights on buying, renting, managing and valuing property in Kenya.";

export const metadata: Metadata = {
  title: "Blog",
  description: `${INTRO} From the team at ${siteConfig.name}.`,
  alternates: { canonical: "/blog" },
};

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const raw = (await searchParams).page;
  const page = Math.max(1, Number(Array.isArray(raw) ? raw[0] : raw) || 1);
  const { data, status } = await safely(() =>
    serverApi.GET("/api/v1/blog/posts/", { params: { query: { page } } }),
  );
  const posts = data?.results ?? [];

  return (
    <>
      <PageHeader title="Blog" intro={INTRO} />
      <section className="container-page py-12 sm:py-16">
        {!data ? (
          <div className="bg-card rounded-2xl border p-10 text-center">
            <h2 className="text-xl font-semibold">
              {status === 404
                ? "That page doesn't exist"
                : "Articles are temporarily unavailable"}
            </h2>
            <p className="text-muted-foreground mt-2">
              Please try again in a moment.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card rounded-2xl border p-10 text-center">
            <h2 className="text-xl font-semibold">No articles yet</h2>
            <p className="text-muted-foreground mt-2">
              Our first articles are on the way. Check back soon.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.slug} className="flex">
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              total={data.count}
              pageSize={BLOG_PAGE_SIZE}
              href={(n) => (n === 1 ? "/blog" : `/blog?page=${n}`)}
            />
          </div>
        )}
      </section>
    </>
  );
}
