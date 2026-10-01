import Link from "next/link";
import { NewspaperIcon } from "lucide-react";

import { CloudImage } from "@/components/cloud-image";
import { readingTime, type PostListItem } from "@/lib/blog";
import { formatDate } from "@/lib/format";

export function PostCard({
  post,
  headingLevel: Heading = "h2",
}: {
  post: PostListItem;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <article className="group bg-card relative flex flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg">
      <div className="bg-muted relative aspect-[16/9] overflow-hidden">
        {post.cover ? (
          <CloudImage
            src={post.cover.public_id}
            alt={post.cover.alt_text}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <NewspaperIcon
            className="text-muted-foreground absolute inset-0 m-auto size-10"
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-muted-foreground text-sm">
          <time dateTime={post.published_at ?? undefined}>
            {formatDate(post.published_at)}
          </time>{" "}
          · {readingTime(post.reading_minutes)}
        </p>
        <Heading className="text-xl leading-snug font-semibold">
          <Link
            href={`/blog/${post.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {post.title}
          </Link>
        </Heading>
        <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
      </div>
    </article>
  );
}
