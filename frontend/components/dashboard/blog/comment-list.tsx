"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  EyeIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api } from "@/lib/api/client";
import { queryKeys, useDashboardComments } from "@/lib/api/hooks";
import { formatDate } from "@/lib/format";

import { BlogTabs } from "./blog-tabs";

const FILTERS = [
  { value: "", label: "All" },
  { value: "false", label: "Visible" },
  { value: "true", label: "Hidden" },
] as const;
const PAGE_SIZE = 20;

export function CommentList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const hidden = params.get("hidden") ?? "";
  const page = Number(params.get("page") ?? "1");
  const [q, setQ] = useState(params.get("q") ?? "");
  const list = useDashboardComments({ hidden, q: params.get("q") ?? "", page });

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

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.comments });

  const setHidden = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: boolean }) => {
      const result = await api.PATCH("/api/v1/dashboard/blog/comments/{id}/", {
        params: { path: { id } },
        body: { is_hidden: value },
      });
      if (!result.response.ok) throw new ApiError(result.response.status);
      return value;
    },
    onSuccess: (value) => {
      toast.success(value ? "Comment hidden" : "Comment restored");
      refresh();
    },
    onError: () => toast.error("Couldn't update the comment."),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const result = await api.DELETE("/api/v1/dashboard/blog/comments/{id}/", {
        params: { path: { id } },
      });
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onSuccess: () => {
      toast.success("Comment deleted");
      refresh();
    },
    onError: () => toast.error("Couldn't delete the comment."),
  });

  const rows = list.data?.results ?? [];
  const total = list.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Comments</h1>
          <p className="text-muted-foreground mt-1">
            Comments appear on the site immediately. Hide any that break the
            rules; you can restore them later.
          </p>
        </div>
        <BlogTabs />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div
          role="group"
          aria-label="Filter comments"
          className="bg-muted flex w-fit rounded-lg p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={hidden === f.value}
              onClick={() => update({ hidden: f.value, page: 1 })}
              className="aria-pressed:bg-background text-muted-foreground aria-pressed:text-foreground h-9 rounded-md px-4 text-sm font-medium aria-pressed:shadow-sm"
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Label htmlFor="comment-search" className="sr-only">
            Search comments
          </Label>
          <SearchIcon
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="comment-search"
            type="search"
            placeholder="Search text, reader or article"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
      </div>

      {list.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : list.isError ? (
        <p className="text-destructive">
          Couldn&apos;t load comments. Please try again.
        </p>
      ) : rows.length === 0 ? (
        <div className="bg-card rounded-2xl border p-10 text-center font-medium">
          {params.get("q") || hidden
            ? "No comments match."
            : "No comments yet."}
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Comments">
          {rows.map((c) => (
            <li
              key={c.id}
              className="bg-card flex flex-col gap-3 rounded-2xl border p-4 data-[hidden=true]:opacity-70 sm:p-5"
              data-hidden={c.is_hidden}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p>
                  <span className="font-semibold">{c.author_name}</span>{" "}
                  <span className="text-muted-foreground">
                    {c.author_email} · {formatDate(c.created_at)}
                  </span>
                </p>
                {c.is_hidden && (
                  <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                    Hidden{c.hidden_by_name ? ` by ${c.hidden_by_name}` : ""}
                  </span>
                )}
              </div>
              <p className="break-words whitespace-pre-line">{c.body}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/blog/${c.post.slug}#comments`}
                  target="_blank"
                  className="text-primary inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                >
                  On “{c.post.title}”
                  <ExternalLinkIcon className="size-3.5" aria-hidden />
                </Link>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={setHidden.isPending}
                    onClick={() =>
                      setHidden.mutate({ id: c.id, value: !c.is_hidden })
                    }
                  >
                    {c.is_hidden ? (
                      <EyeIcon data-icon="inline-start" />
                    ) : (
                      <EyeOffIcon data-icon="inline-start" />
                    )}
                    {c.is_hidden ? "Restore" : "Hide"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm">
                        <Trash2Icon data-icon="inline-start" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete this comment?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          It is removed for good. To keep a record, hide it
                          instead.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(c.id)}>
                          Delete comment
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
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
            Page {page} of {pages} · {total} comments
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
