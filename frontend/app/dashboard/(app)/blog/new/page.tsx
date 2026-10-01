import type { Metadata } from "next";

import { PostForm } from "@/components/dashboard/blog/post-form";

export const metadata: Metadata = { title: "Write an article" };

export default function NewPostPage() {
  return <PostForm />;
}
