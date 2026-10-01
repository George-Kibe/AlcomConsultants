import type { Metadata } from "next";
import { Suspense } from "react";

import { CommentList } from "@/components/dashboard/blog/comment-list";

export const metadata: Metadata = { title: "Blog comments" };

export default function BlogCommentsPage() {
  return (
    <Suspense>
      <CommentList />
    </Suspense>
  );
}
