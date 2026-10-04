"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageOffIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CloudImage } from "@/components/cloud-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api } from "@/lib/api/client";
import { queryKeys, useDashboardPosts } from "@/lib/api/hooks";
import { formatDate } from "@/lib/format";

import { ConfirmDelete, deleteArticleText } from "../confirm-delete";
import { StatusBadge } from "../properties/status-badge";
import { BlogTabs } from "./blog-tabs";

const TABS = [
  { value: "", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
] as const;
const PAGE_SIZE = 20;

export function PostList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const page = Number(params.get("page") ?? "1");
  const [q, setQ] = useState(params.get("q") ?? "");
  const list = useDashboardPosts({ status, q: params.get("q") ?? "", page });
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: async (uuid: string) => {
      const result = await api.DELETE("/api/v1/dashboard/blog/posts/{uuid}/", {
        params: { path: { uuid } },
      });
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      toast.success("Article deleted");
    },
    onError: () => toast.error("Couldn't delete this article."),
  });

  function update(next: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "" || (k === "page" && v === 1))
        sp.delete(k);
      else sp.set(k, String(v));
    }
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (params.get("q") ?? "")) update({ q, page: 1 });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const rows = list.data?.results ?? [];
  const total = list.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Blog</h1>
          <p className="text-muted-foreground mt-1">
            Write and publish articles for the website.
          </p>
        </div>
        <Button asChild size="xl">
          <Link href="/dashboard/blog/new">
            <PlusIcon data-icon="inline-start" />
            Write an article
          </Link>
        </Button>
      </div>
      <BlogTabs />

      <nav aria-label="Filter by status" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-1 border-b">
          {TABS.map((tab) => (
            <li key={tab.value}>
              <button
                type="button"
                onClick={() => update({ status: tab.value, page: 1 })}
                aria-current={status === tab.value ? "page" : undefined}
                className="text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground -mb-px flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap"
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="relative">
        <Label htmlFor="post-search" className="sr-only">
          Search articles
        </Label>
        <SearchIcon
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          id="post-search"
          type="search"
          placeholder="Search by title"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {list.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : list.isError ? (
        <p className="text-destructive">
          Couldn&apos;t load articles. Please try again.
        </p>
      ) : rows.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-10 text-center">
          <p className="font-medium">
            {params.get("q") || status
              ? "No articles match."
              : "No articles yet."}
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard/blog/new">Write your first article</Link>
          </Button>
        </div>
      ) : (
        <ul
          className="bg-card divide-y rounded-2xl border"
          aria-label="Articles"
        >
          {rows.map((post) => (
            <li key={post.uuid} className="hover:bg-muted/60 flex items-center">
              <Link
                href={`/dashboard/blog/${post.uuid}`}
                className="flex min-w-0 flex-1 items-center gap-4 p-3 sm:p-4"
              >
                {post.cover ? (
                  <CloudImage
                    src={post.cover.public_id}
                    alt=""
                    width={96}
                    height={72}
                    crop="fill"
                    className="h-14 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="bg-muted text-muted-foreground flex h-14 w-20 shrink-0 items-center justify-center rounded-lg">
                    <ImageOffIcon
                      className="size-5"
                      aria-label="No cover photo yet"
                    />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{post.title}</span>
                    <StatusBadge status={post.status ?? "draft"} />
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-sm">
                    {post.author_name}
                    {post.published_at
                      ? ` · Published ${formatDate(post.published_at)}`
                      : ""}{" "}
                    · Updated {formatDate(post.updated_at)}
                  </p>
                </div>
              </Link>
              <div className="pr-2 sm:pr-3">
                <ConfirmDelete
                  icon
                  name={post.title}
                  title={`Delete “${post.title}”?`}
                  description={deleteArticleText(post)}
                  onConfirm={() => remove.mutate(post.uuid)}
                  disabled={remove.isPending}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between"
        >
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => update({ page: page - 1 })}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {pages} · {total} articles
          </span>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => update({ page: page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
