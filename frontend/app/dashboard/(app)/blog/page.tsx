import type { Metadata } from "next";
import { Suspense } from "react";

import { PostList } from "@/components/dashboard/blog/post-list";

export const metadata: Metadata = { title: "Blog" };

export default function BlogPostsPage() {
  return (
    <Suspense>
      <PostList />
    </Suspense>
  );
}
