"use client";

import { useParams } from "next/navigation";

import { PostForm } from "@/components/dashboard/blog/post-form";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { useDashboardPost } from "@/lib/api/hooks";

export default function EditPostPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const post = useDashboardPost(uuid);

  if (post.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (post.isError) {
    const missing = post.error instanceof ApiError && post.error.status === 404;
    return (
      <p>
        {missing
          ? "This article doesn't exist (it may have been deleted)."
          : "Couldn't load this article."}
      </p>
    );
  }
  return <PostForm key={post.data.uuid} post={post.data} />;
}
