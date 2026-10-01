"use client";

import Link from "next/link";
import { MessageSquareIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ensureCsrf, resendVerification } from "@/lib/api/auth";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatDate } from "@/lib/format";

type Comment = components["schemas"]["Comment"];
type Me = components["schemas"]["Me"];

const MAX_LENGTH = 2000;
const errorBody = (result: object) =>
  (result as { error?: Record<string, string[] | string> }).error;

/** Comments under an article: anyone can read; verified readers can post. */
export function Comments({ slug }: { slug: string }) {
  const id = useId();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const path = `/blog/${slug}#comments`;
  const next = encodeURIComponent(path);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/blog/posts/{post_slug}/comments/", {
      params: { path: { post_slug: slug } },
    });
    setComments(result.data ?? []);
  }, [slug]);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [, who] = await Promise.all([
        load(),
        api.GET("/api/v1/me/"),
        ensureCsrf(),
      ]);
      if (live) setMe(who.data ?? null);
    })();
    return () => {
      live = false;
    };
  }, [load]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const result = await api.POST("/api/v1/blog/posts/{post_slug}/comments/", {
      params: { path: { post_slug: slug } },
      body: { body },
    });
    setBusy(false);
    if (result.response.ok && result.data) {
      setComments((c) => [...(c ?? []), result.data!]);
      setBody("");
      return;
    }
    const status = result.response.status;
    const field = errorBody(result)?.body;
    setError(
      status === 429
        ? "You're commenting very quickly. Please wait a minute and try again."
        : field
          ? Array.isArray(field)
            ? field[0]
            : field
          : "Couldn't post your comment. Please try again.",
    );
  }

  async function remove(comment: Comment) {
    const result = await api.DELETE(
      "/api/v1/blog/posts/{post_slug}/comments/{id}/",
      { params: { path: { post_slug: slug, id: comment.id } } },
    );
    if (result.response.ok)
      setComments((c) => (c ?? []).filter((x) => x.id !== comment.id));
  }

  const count = comments?.length ?? 0;

  return (
    <section
      id="comments"
      aria-labelledby={`${id}-heading`}
      className="mx-auto mt-12 max-w-3xl scroll-mt-24 border-t pt-10"
    >
      <h2 id={`${id}-heading`} className="text-2xl font-bold">
        Comments{comments ? ` (${count})` : ""}
      </h2>

      {comments === null ? (
        <p className="text-muted-foreground mt-4" role="status">
          Loading comments…
        </p>
      ) : count === 0 ? (
        <p className="text-muted-foreground mt-4">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <ol className="mt-6 flex flex-col gap-6">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <span
                className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-full font-semibold"
                aria-hidden
              >
                {comment.author_name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold">{comment.author_name}</span>
                  <time
                    dateTime={comment.created_at}
                    className="text-muted-foreground"
                  >
                    {formatDate(comment.created_at)}
                  </time>
                </p>
                <p className="mt-1 break-words whitespace-pre-line">
                  {comment.body}
                </p>
                {comment.is_mine && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground mt-1 -ml-2"
                    onClick={() => void remove(comment)}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8">
        {me === undefined ? null : me === null ? (
          <div className="bg-muted/60 flex flex-col items-start gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2">
              <MessageSquareIcon className="text-success size-5" aria-hidden />
              Sign in to join the conversation.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/account/sign-up?next=${next}`}>
                  Create account
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/account/sign-in?next=${next}`}>Sign in</Link>
              </Button>
            </div>
          </div>
        ) : !me.can_comment ? (
          <div className="bg-muted/60 flex flex-col gap-3 rounded-2xl p-5">
            <p>
              Please confirm your email address to comment. We sent a link to{" "}
              <strong>{me.email}</strong>.
            </p>
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={resent}
                onClick={async () => {
                  await resendVerification(me.email);
                  setResent(true);
                }}
              >
                {resent ? "Email sent" : "Send the link again"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={post} className="flex flex-col gap-3">
            <Label htmlFor={`${id}-body`}>
              Comment as {me.full_name || me.email}
            </Label>
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Textarea
              id={`${id}-body`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={MAX_LENGTH}
              required
              aria-describedby={`${id}-hint`}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p id={`${id}-hint`} className="text-muted-foreground text-xs">
                Be respectful. Comments appear immediately; our team may remove
                ones that break the rules. {body.length}/{MAX_LENGTH}
              </p>
              <Button type="submit" disabled={busy || body.trim().length < 2}>
                {busy ? "Posting…" : "Post comment"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
