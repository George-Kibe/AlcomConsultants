import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChevronRightIcon } from "lucide-react";

import { Comments } from "@/components/blog/comments";
import { CloudImage } from "@/components/cloud-image";
import { WhatsAppIcon } from "@/components/icons";
import { CtaBand } from "@/components/site/cta-band";
import { PostCard } from "@/components/site/post-card";
import { Button } from "@/components/ui/button";
import { safely, serverApi } from "@/lib/api/server";
import { postJsonLd, readingTime } from "@/lib/blog";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { formatDate } from "@/lib/format";
import { jsonLd } from "@/lib/json-ld";
import { siteConfig } from "@/lib/site-config";

const SHARE_IMAGE = "c_fill,w_1200,h_630,g_auto,f_jpg,q_auto";

/** One fetch per request, shared by generateMetadata and the page. */
const getPost = cache(async (slug: string) =>
  safely(() =>
    serverApi.GET("/api/v1/blog/posts/{slug}/", { params: { path: { slug } } }),
  ),
);

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { data: post } = await getPost(slug);
  if (!post) return { title: "Article not found" };
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    // Demo articles stay out of search engines.
    ...(post.is_demo && { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [post.author_name],
      images: post.cover
        ? [
            {
              url: cloudinaryUrl(post.cover.public_id, SHARE_IMAGE),
              width: 1200,
              height: 630,
              alt: post.cover.alt_text,
            },
          ]
        : undefined,
    },
  };
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const [{ data: post, status }, latest] = await Promise.all([
    getPost(slug),
    safely(() => serverApi.GET("/api/v1/blog/posts/")),
  ]);
  if (!post) {
    if (status === 404) notFound();
    throw new Error("Article temporarily unavailable");
  }
  const url = `${siteConfig.url}/blog/${post.slug}`;
  const more = (latest.data?.results ?? [])
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);
  const share = `https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`;

  return (
    <>
      <article className="container-page py-8 sm:py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              postJsonLd(
                post,
                url,
                post.cover
                  ? cloudinaryUrl(post.cover.public_id, SHARE_IMAGE)
                  : undefined,
              ),
            ),
          }}
        />
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-1">
                <ChevronRightIcon className="size-3.5" aria-hidden />
                <Link href="/blog" className="hover:text-foreground">
                  Blog
                </Link>
              </li>
            </ol>
          </nav>
          <h1 className="text-3xl leading-tight font-bold sm:text-5xl">
            {post.title}
          </h1>
          <p className="text-muted-foreground mt-4 flex flex-wrap gap-x-2 text-sm sm:text-base">
            <span>By {post.author_name}</span>
            <span aria-hidden>·</span>
            <time dateTime={post.published_at ?? undefined}>
              {formatDate(post.published_at)}
            </time>
            <span aria-hidden>·</span>
            <span>{readingTime(post.reading_minutes)}</span>
          </p>
        </div>

        {post.cover && (
          <figure className="mx-auto mt-8 max-w-5xl">
            <CloudImage
              src={post.cover.public_id}
              alt={post.cover.alt_text}
              width={1600}
              height={900}
              crop="fill"
              sizes="(min-width: 1024px) 1024px, 100vw"
              preload
              className="aspect-[16/9] w-full rounded-2xl object-cover"
            />
          </figure>
        )}

        <div
          className="rich-text mx-auto mt-10 max-w-3xl"
          // Sanitised on the server when saved (apps/blog/html.py).
          dangerouslySetInnerHTML={{ __html: post.body ?? "" }}
        />

        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center gap-3 border-t pt-6">
          <span className="text-muted-foreground text-sm">
            Found this useful?
          </span>
          <Button asChild variant="outline">
            <a href={share} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon data-icon="inline-start" />
              Share on WhatsApp
            </a>
          </Button>
        </div>

        <Comments slug={post.slug} />
      </article>

      {more.length > 0 && (
        <section
          className="bg-muted/60 py-12 sm:py-16"
          aria-labelledby="more-articles"
        >
          <div className="container-page">
            <h2
              id="more-articles"
              className="mb-8 text-2xl font-bold sm:text-3xl"
            >
              More articles
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((p) => (
                <li key={p.slug} className="flex">
                  <PostCard post={p} headingLevel="h3" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <CtaBand />
    </>
  );
}
