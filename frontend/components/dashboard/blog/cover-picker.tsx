"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CloudImage } from "@/components/cloud-image";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks";
import type { DashboardPost } from "@/lib/blog-form";
import {
  ACCEPTED_TYPES,
  rejectReason,
  uploadToCloudinary,
} from "@/lib/uploads";

/** The single cover photo of a post: upload (signed, direct to Cloudinary), replace or remove. */
export function CoverPicker({
  post,
  altText,
  onSaved,
}: {
  post: DashboardPost;
  altText: string;
  onSaved: (post: DashboardPost) => void;
}) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const cover = post.cover;
  const published = post.status === "published";

  const saved = (next: DashboardPost) => {
    queryClient.setQueryData(queryKeys.post(next.uuid), next);
    void queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    onSaved(next);
  };

  async function upload(file: File) {
    const sig = await api.POST("/api/v1/dashboard/uploads/signature/", {
      body: { target: "blog" },
    });
    if (!sig.data)
      return toast.error("Couldn't start the upload. Please try again.");
    const problem = rejectReason(file, sig.data.max_bytes);
    if (problem) return toast.error(problem);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, sig.data, setProgress);
      const attached = await api.POST(
        "/api/v1/dashboard/blog/posts/{uuid}/cover/",
        {
          params: { path: { uuid: post.uuid } },
          body: { ...result, alt_text: altText },
        },
      );
      if (!attached.data) throw new Error("The upload couldn't be verified.");
      saved(attached.data);
      toast.success(cover ? "Cover photo replaced" : "Cover photo added");
    } catch (e) {
      toast.error((e as Error).message || "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  const remove = useMutation({
    mutationFn: async () => {
      const result = await api.DELETE(
        "/api/v1/dashboard/blog/posts/{uuid}/cover/",
        { params: { path: { uuid: post.uuid } } },
      );
      if (!result.data) throw new ApiError(result.response.status);
      return result.data;
    },
    onSuccess: (next) => {
      saved(next);
      toast.success("Cover photo removed");
    },
    onError: () => toast.error("Couldn't remove the cover photo."),
  });

  const busy = progress !== null || remove.isPending;

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      {cover ? (
        <div className="relative overflow-hidden rounded-xl border">
          <CloudImage
            src={cover.public_id}
            alt={cover.alt_text}
            width={1200}
            height={630}
            crop="fill"
            className="aspect-[1200/630] w-full object-cover"
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="text-muted-foreground hover:border-primary/50 hover:text-foreground flex aspect-[1200/630] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm"
        >
          <ImagePlusIcon className="size-8" aria-hidden />
          <span className="font-medium">Add a cover photo</span>
          <span className="text-xs">
            Landscape works best (at least 1600 px wide). Max 20 MB.
          </span>
        </button>
      )}

      {progress !== null && (
        <div
          role="progressbar"
          aria-label="Uploading cover photo"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-muted h-2 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full transition-[width]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {cover && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Replace photo
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy || published}
            title={
              published
                ? "A published article needs a cover photo. Replace it instead."
                : undefined
            }
            onClick={() => remove.mutate()}
          >
            <Trash2Icon data-icon="inline-start" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
