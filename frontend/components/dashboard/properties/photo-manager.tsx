"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GripVerticalIcon,
  ImagePlusIcon,
  StarIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";

import { CloudImage } from "@/components/cloud-image";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import {
  PHOTO_GUIDE,
  photoAdvice,
  rejectReason,
  uploadToCloudinary,
  type UploadSignature,
} from "@/lib/uploads";

type Media = components["schemas"]["PropertyMedia"];
type Upload = { id: string; name: string; progress: number; error?: string };

const CONCURRENT_UPLOADS = 3;

function mediaKey(uuid: string) {
  return ["dashboard", "property", uuid, "media"] as const;
}

function SortablePhoto({
  item,
  index,
  propertyUuid,
  onMakeCover,
}: {
  item: Media;
  index: number;
  propertyUuid: string;
  onMakeCover: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  });
  const [alt, setAlt] = useState(item.alt_text ?? "");

  const update = useMutation({
    mutationFn: async (body: {
      alt_text?: string;
      kind?: "image" | "floor_plan";
    }) =>
      unwrap(
        await api.PATCH(
          "/api/v1/dashboard/properties/{property_uuid}/media/{id}/",
          {
            params: { path: { property_uuid: propertyUuid, id: item.id } },
            body,
          },
        ),
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: mediaKey(propertyUuid) }),
    onError: () => toast.error("Couldn't save the photo details."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const r = await api.DELETE(
        "/api/v1/dashboard/properties/{property_uuid}/media/{id}/",
        {
          params: { path: { property_uuid: propertyUuid, id: item.id } },
        },
      );
      if (!r.response.ok) throw new ApiError(r.response.status);
    },
    onSuccess: () => {
      toast.success("Photo deleted");
      void queryClient.invalidateQueries({ queryKey: mediaKey(propertyUuid) });
    },
    onError: () => toast.error("Couldn't delete the photo."),
  });

  const isCover = index === 0 && item.kind === "image";
  const advice =
    item.kind === "image" ? photoAdvice(item.width, item.height) : undefined;
  const label = `Photo ${index + 1}${item.alt_text ? `: ${item.alt_text}` : ""}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card flex flex-col overflow-hidden rounded-xl border",
        isDragging && "ring-primary z-10 shadow-lg ring-2",
      )}
      aria-label={label}
    >
      <div className="relative aspect-[4/3]">
        <CloudImage
          src={item.public_id}
          alt={item.alt_text || ""}
          fill
          sizes="(min-width: 1024px) 240px, 45vw"
          className="object-cover"
        />
        {advice && (
          <span className="absolute inset-x-2 bottom-2 flex items-center gap-1 rounded-md bg-amber-50/95 px-2 py-1 text-xs font-medium text-amber-900">
            <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden />
            {advice}
          </span>
        )}
        {isCover && (
          <span className="bg-brand-navy absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white">
            Cover
          </span>
        )}
        <button
          type="button"
          className="bg-background/90 hover:bg-background absolute top-2 right-2 flex size-9 cursor-grab touch-none items-center justify-center rounded-lg shadow active:cursor-grabbing"
          aria-label={`Move ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <label className="sr-only" htmlFor={`alt-${item.id}`}>
          Describe {label}
        </label>
        <Input
          id={`alt-${item.id}`}
          value={alt}
          placeholder="Describe the photo (e.g. Living room)"
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() =>
            alt !== (item.alt_text ?? "") && update.mutate({ alt_text: alt })
          }
          className="h-9 text-sm"
          maxLength={200}
        />
        <div className="flex items-center gap-1">
          <Select
            value={item.kind ?? "image"}
            onValueChange={(v) =>
              update.mutate({ kind: v as "image" | "floor_plan" })
            }
          >
            <SelectTrigger
              className="h-9 flex-1 text-sm"
              aria-label={`Type of ${label}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Photo</SelectItem>
              <SelectItem value="floor_plan">Floor plan</SelectItem>
            </SelectContent>
          </Select>
          {!isCover && item.kind === "image" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={onMakeCover}
              aria-label={`Make ${label} the cover photo`}
            >
              <StarIcon />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={`Delete ${label}`}
              >
                <Trash2Icon className="text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
                <AlertDialogDescription>
                  It will be removed from the listing and from Cloudinary.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove.mutate()}>
                  Delete photo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </li>
  );
}

export function PhotoManager({ propertyUuid }: { propertyUuid: string }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const media = useQuery({
    queryKey: mediaKey(propertyUuid),
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/dashboard/properties/{property_uuid}/media/", {
          params: { path: { property_uuid: propertyUuid } },
        }),
      ),
  });

  const reorder = useMutation({
    mutationFn: async (ids: number[]) =>
      unwrap(
        await api.POST(
          "/api/v1/dashboard/properties/{property_uuid}/media/reorder/",
          {
            params: { path: { property_uuid: propertyUuid } },
            body: { ids },
          },
        ),
      ),
    onMutate: (ids) => {
      const previous = queryClient.getQueryData<Media[]>(
        mediaKey(propertyUuid),
      );
      if (previous) {
        queryClient.setQueryData(
          mediaKey(propertyUuid),
          ids.map((id) => previous.find((m) => m.id === id)!),
        );
      }
      return { previous };
    },
    onError: (_e, _ids, ctx) => {
      queryClient.setQueryData(mediaKey(propertyUuid), ctx?.previous);
      toast.error("Couldn't save the new order.");
    },
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: mediaKey(propertyUuid) }),
  });

  const items = media.data ?? [];

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((m) => m.id === active.id);
    const to = items.findIndex((m) => m.id === over.id);
    reorder.mutate(arrayMove(items, from, to).map((m) => m.id));
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    const sig = await api.POST("/api/v1/dashboard/uploads/signature/", {
      body: { target: "properties" },
    });
    if (!sig.data)
      return toast.error("Couldn't start the upload. Please try again.");
    const signature: UploadSignature = sig.data;

    const queue = files.map((file) => ({ file, id: crypto.randomUUID() }));
    setUploads((u) => [
      ...u,
      ...queue.map(({ file, id }) => ({
        id,
        name: file.name,
        progress: 0,
        error: rejectReason(file, signature.max_bytes),
      })),
    ]);

    const valid = queue.filter(
      ({ file }) => !rejectReason(file, signature.max_bytes),
    );
    const set = (id: string, patch: Partial<Upload>) =>
      setUploads((u) => u.map((x) => (x.id === id ? { ...x, ...patch } : x)));

    let done = 0;
    async function worker() {
      for (let next = valid.shift(); next; next = valid.shift()) {
        const { file, id } = next;
        try {
          const result = await uploadToCloudinary(file, signature, (p) =>
            set(id, { progress: p }),
          );
          const attached = await api.POST(
            "/api/v1/dashboard/properties/{property_uuid}/media/",
            {
              params: { path: { property_uuid: propertyUuid } },
              body: { ...result, kind: "image", alt_text: "" },
            },
          );
          if (!attached.response.ok)
            throw new Error("The upload couldn't be verified.");
          setUploads((u) => u.filter((x) => x.id !== id));
          done += 1;
          void queryClient.invalidateQueries({
            queryKey: mediaKey(propertyUuid),
          });
        } catch (e) {
          set(id, { error: (e as Error).message });
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENT_UPLOADS }, worker));
    if (done) toast.success(`${done} photo${done === 1 ? "" : "s"} added`);
  }

  return (
    <section
      className="bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:p-6"
      aria-labelledby="photos-heading"
    >
      <div>
        <h2 id="photos-heading" className="text-lg font-semibold">
          Photos & floor plans
        </h2>
        <p className="text-muted-foreground text-sm">
          The first photo is the cover. Drag to reorder (or focus the handle and
          use the arrow keys). Describe each photo for screen readers and search
          engines.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles([...e.dataTransfer.files]);
        }}
        className={cn(
          "hover:border-primary/60 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver && "border-primary bg-secondary",
        )}
      >
        <ImagePlusIcon className="text-muted-foreground size-8" aria-hidden />
        <span className="font-medium">Drop photos here or click to choose</span>
        <span className="text-muted-foreground text-xs">
          JPG, PNG, WebP, AVIF or HEIC · up to 20 MB each
        </span>
        <span className="text-muted-foreground max-w-md text-xs">
          {PHOTO_GUIDE}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          className="sr-only"
          aria-label="Upload photos"
          onChange={(e) => {
            void uploadFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </label>

      {uploads.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Uploads">
          {uploads.map((u) => (
            <li key={u.id} className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              {u.error ? (
                <>
                  <span className="text-destructive" role="alert">
                    {u.error}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setUploads((all) => all.filter((x) => x.id !== u.id))
                    }
                  >
                    Dismiss
                  </Button>
                </>
              ) : (
                <progress
                  value={u.progress}
                  max={1}
                  className="accent-primary h-2 w-40"
                  aria-label={`Uploading ${u.name}`}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((m) => m.id)}
            strategy={rectSortingStrategy}
          >
            <ul
              className="grid grid-cols-2 gap-3 lg:grid-cols-4"
              aria-label="Photos"
            >
              {items.map((item, index) => (
                <SortablePhoto
                  key={item.id}
                  item={item}
                  index={index}
                  propertyUuid={propertyUuid}
                  onMakeCover={() =>
                    reorder.mutate([
                      item.id,
                      ...items.filter((m) => m.id !== item.id).map((m) => m.id),
                    ])
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        !media.isPending && (
          <p className="text-muted-foreground text-sm">
            No photos yet. Listings with photos get far more enquiries.
          </p>
        )
      )}
    </section>
  );
}
