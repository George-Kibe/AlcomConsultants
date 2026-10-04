"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks";
import {
  emptyPost,
  postFromApi,
  postPayload,
  postSchema,
  type DashboardPost,
  type PostFormValues,
} from "@/lib/blog-form";
import { formatDate } from "@/lib/format";
import type { CloudinaryUploadResult } from "@/lib/uploads";

import { ConfirmDelete, deleteArticleText } from "../confirm-delete";
import { Field, Section } from "../form-parts";
import { StatusBadge } from "../properties/status-badge";
import { CoverPicker } from "./cover-picker";
import { RichTextEditor } from "./rich-text-editor";

type Status = "draft" | "published";
type FieldErrors = Record<string, string[] | string>;

const errorBody = (result: object) => (result as { error?: unknown }).error;
const firstMessage = (m: string[] | string) => (Array.isArray(m) ? m[0] : m);

export function PostForm({ post }: { post?: DashboardPost }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = useId();
  const f = (name: string) => `${id}-${name}`;
  const isNew = !post;
  const [coverError, setCoverError] = useState<string>();
  // A new article's cover is uploaded before the article exists; it's sent on create.
  const [pendingCover, setPendingCover] =
    useState<CloudinaryUploadResult | null>(null);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: post ? postFromApi(post) : emptyPost,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setError, formState } = form;
  const { errors, isDirty, isSubmitting } = formState;
  const coverAlt = useWatch({ control, name: "cover_alt" });
  const fieldError = (name: keyof PostFormValues) =>
    errors[name]?.message as string | undefined;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if ((isDirty || pendingCover) && !isSubmitting) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, isSubmitting, pendingCover]);

  const afterSave = (saved: DashboardPost) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    queryClient.setQueryData(queryKeys.post(saved.uuid), saved);
  };

  const save = useMutation({
    mutationFn: async ({
      values,
      status,
    }: {
      values: PostFormValues;
      status?: Status;
    }) => {
      const body = {
        ...postPayload(values, isNew),
        ...(status && { status }),
        ...(isNew &&
          pendingCover && {
            cover_upload: { ...pendingCover, alt_text: values.cover_alt },
          }),
      };
      const result = post
        ? await api.PATCH("/api/v1/dashboard/blog/posts/{uuid}/", {
            params: { path: { uuid: post.uuid } },
            body,
          })
        : await api.POST("/api/v1/dashboard/blog/posts/", { body });
      // Error bodies aren't in the OpenAPI types, so check the HTTP status.
      if (!result.response.ok)
        throw Object.assign(new ApiError(result.response.status), {
          fieldErrors: errorBody(result) as FieldErrors,
        });
      return result.data!;
    },
    onSuccess: (saved, { status }) => {
      afterSave(saved);
      form.reset(postFromApi(saved));
      setCoverError(undefined);
      setPendingCover(null);
      toast.success(
        status === "published"
          ? "Article published"
          : isNew
            ? saved.cover
              ? "Draft saved. Publish when ready."
              : "Draft saved. Add a cover photo, then publish when ready."
            : status === "draft"
              ? "Article unpublished (now a draft)"
              : "Changes saved",
      );
      if (isNew) router.replace(`/dashboard/blog/${saved.uuid}`);
    },
    onError: (error: ApiError & { fieldErrors?: FieldErrors }) => {
      let shown = false;
      for (const [name, messages] of Object.entries(error.fieldErrors ?? {})) {
        if (name === "cover") {
          setCoverError(firstMessage(messages));
          shown = true;
        } else if (name in emptyPost) {
          setError(name as FieldPath<PostFormValues>, {
            message: firstMessage(messages),
          });
          shown = true;
        }
      }
      toast.error(
        shown
          ? "Please fix the highlighted fields."
          : "Couldn't save. Please try again.",
      );
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const result = await api.DELETE("/api/v1/dashboard/blog/posts/{uuid}/", {
        params: { path: { uuid: post!.uuid } },
      });
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      toast.success("Article deleted");
      router.replace("/dashboard/blog");
    },
    onError: () => toast.error("Couldn't delete this article."),
  });

  const submit = (status?: Status) =>
    handleSubmit(
      (values) => {
        if (status === "published" && !post?.cover && !pendingCover) {
          setCoverError("Add a cover photo before publishing.");
          return toast.error("Add a cover photo before publishing.");
        }
        save.mutate({ values, status });
      },
      () => toast.error("Please fix the highlighted fields."),
    );

  const published = post?.status === "published";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit()();
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">
            <Link
              href="/dashboard/blog"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Blog
            </Link>{" "}
            / {post ? "Edit article" : "New"}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {post ? post.title : "Write an article"}
          </h1>
          {post && (
            <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={post.status ?? "draft"} />
              Updated {formatDate(post.updated_at)}
              {post.updated_by_name ? ` by ${post.updated_by_name}` : ""}
            </p>
          )}
        </div>
        {post && (
          <div className="flex gap-2">
            {published && (
              <Button asChild variant="outline">
                <Link href={`/blog/${post.slug}`} target="_blank">
                  View on site
                  <ExternalLinkIcon data-icon="inline-end" />
                </Link>
              </Button>
            )}
            <ConfirmDelete
              name={post.title}
              title="Delete this article?"
              description={deleteArticleText(post)}
              onConfirm={() => remove.mutate()}
              disabled={remove.isPending}
            />
          </div>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Section title="Article">
            <Field
              label="Title"
              htmlFor={f("title")}
              error={fieldError("title")}
            >
              <Input
                id={f("title")}
                {...register("title")}
                aria-invalid={!!errors.title}
                className="h-11 text-lg"
              />
            </Field>
            <div className="flex flex-col gap-2">
              <span id={f("body-label")} className="text-sm font-medium">
                Body
              </span>
              <Controller
                control={control}
                name="body"
                render={({ field }) => (
                  <RichTextEditor
                    id={f("body")}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={!!errors.body}
                    labelledBy={f("body-label")}
                    describedBy={errors.body ? f("body-error") : undefined}
                  />
                )}
              />
              {errors.body && (
                <p
                  id={f("body-error")}
                  className="text-destructive text-sm"
                  role="alert"
                >
                  {fieldError("body")}
                </p>
              )}
            </div>
          </Section>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-20">
          <Section
            title="Cover photo"
            description="Shown at the top of the article, on blog cards and when shared."
          >
            <CoverPicker
              post={post}
              pending={pendingCover}
              onPending={setPendingCover}
              altText={coverAlt}
              onSaved={() => setCoverError(undefined)}
            />
            {coverError && (
              <p className="text-destructive text-sm" role="alert">
                {coverError}
              </p>
            )}
            <Field
              label="Photo description"
              htmlFor={f("cover_alt")}
              error={fieldError("cover_alt")}
              hint="Describe the photo for screen readers, e.g. “Title deed and keys on a desk”."
            >
              <Input
                id={f("cover_alt")}
                {...register("cover_alt")}
                className="h-11"
              />
            </Field>
          </Section>

          <Section title="Summary">
            <Field
              label="Short summary (optional)"
              htmlFor={f("excerpt")}
              error={fieldError("excerpt")}
              hint="Shown on blog cards. Leave empty to use the opening lines."
            >
              <Textarea id={f("excerpt")} rows={3} {...register("excerpt")} />
            </Field>
            <details className="group">
              <summary className="text-primary cursor-pointer text-sm font-medium">
                Web address and search engine settings
              </summary>
              <div className="mt-4 grid gap-4">
                <Field
                  label="Web address"
                  htmlFor={f("slug")}
                  error={fieldError("slug")}
                  hint={
                    isNew
                      ? "Created from the title if left empty."
                      : "Changing it breaks links people already shared."
                  }
                >
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">
                      /blog/
                    </span>
                    <Input
                      id={f("slug")}
                      {...register("slug")}
                      className="h-11"
                    />
                  </div>
                </Field>
                <Field
                  label="SEO title"
                  htmlFor={f("seo_title")}
                  error={fieldError("seo_title")}
                  hint="Defaults to the title. Max 70 characters."
                >
                  <Input
                    id={f("seo_title")}
                    {...register("seo_title")}
                    className="h-11"
                  />
                </Field>
                <Field
                  label="SEO description"
                  htmlFor={f("seo_description")}
                  error={fieldError("seo_description")}
                  hint="Defaults to the summary. Max 160 characters."
                >
                  <Textarea
                    id={f("seo_description")}
                    rows={2}
                    {...register("seo_description")}
                  />
                </Field>
              </div>
            </details>
          </Section>
        </div>
      </div>

      <div className="bg-background/95 sticky bottom-0 -mx-4 flex flex-col gap-2 border-t px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-xl sm:border">
        {isNew ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="xl"
              disabled={save.isPending}
              onClick={() => void submit("published")()}
            >
              Publish
            </Button>
            <Button type="submit" size="xl" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save draft"}
            </Button>
          </>
        ) : (
          <>
            {published ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="xl"
                    disabled={save.isPending}
                  >
                    Unpublish
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unpublish this article?</AlertDialogTitle>
                    <AlertDialogDescription>
                      It disappears from the blog and becomes a draft. You can
                      publish it again at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void submit("draft")()}>
                      Unpublish
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="xl"
                disabled={save.isPending}
                onClick={() => void submit("published")()}
              >
                Publish
              </Button>
            )}
            <Button
              type="submit"
              size="xl"
              disabled={save.isPending || !isDirty}
            >
              {save.isPending ? "Saving…" : isDirty ? "Save changes" : "Saved"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
