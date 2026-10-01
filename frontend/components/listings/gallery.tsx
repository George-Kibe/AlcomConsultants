"use client";

import { ChevronLeftIcon, ChevronRightIcon, GridIcon } from "lucide-react";
import { useState } from "react";

import { CloudImage } from "@/components/cloud-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/** Grid shape for 1, 2, 3, 4 and 5+ photos. */
const GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-4 grid-rows-2", // big (2×2) + two wide, stacked
  4: "grid-cols-4 grid-rows-2", // big (2×2) + one tall + two stacked
  5: "grid-cols-4 grid-rows-2", // big (2×2) + four
};

type Photo = {
  public_id: string;
  alt_text: string;
  width?: number | null;
  height?: number | null;
};

export function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  if (photos.length === 0) return null;

  const show = (i: number) => {
    setIndex(i);
    setOpen(true);
  };
  const step = (d: number) =>
    setIndex((i) => (i + d + photos.length) % photos.length);
  const alt = (p: Photo, i: number) =>
    p.alt_text || `${title} — photo ${i + 1}`;
  const current = photos[index];

  return (
    <>
      {/* Mobile: swipeable strip */}
      <ul
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:hidden"
        aria-label="Photos"
      >
        {photos.map((p, i) => (
          <li key={p.public_id} className="w-[88%] shrink-0 snap-center">
            <button
              type="button"
              onClick={() => show(i)}
              className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl"
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
            >
              <CloudImage
                src={p.public_id}
                alt={alt(p, i)}
                fill
                sizes="88vw"
                preload={i === 0}
                className="object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {/* Tablet and up: the first photo is largest; the grid adapts to the photo count */}
      <div
        className={`relative hidden aspect-2/1 gap-2 overflow-hidden rounded-2xl sm:grid ${GRID[Math.min(photos.length, 5)]}`}
      >
        {photos.slice(0, 5).map((p, i) => (
          <button
            key={p.public_id}
            type="button"
            onClick={() => show(i)}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            className={`relative overflow-hidden ${i === 0 && photos.length > 2 ? "col-span-2 row-span-2" : ""} ${i === 1 && photos.length === 4 ? "row-span-2" : ""} ${i > 0 && photos.length === 3 ? "col-span-2" : ""}`}
          >
            <CloudImage
              src={p.public_id}
              alt={alt(p, i)}
              fill
              sizes={
                i === 0
                  ? "(min-width: 1280px) 640px, 50vw"
                  : "(min-width: 1280px) 320px, 25vw"
              }
              preload={i === 0}
              className="object-cover transition-transform duration-300 hover:scale-105 motion-reduce:transition-none"
            />
          </button>
        ))}
        {photos.length > 1 && (
          <Button
            type="button"
            variant="outline"
            className="bg-background absolute right-3 bottom-3"
            onClick={() => show(0)}
          >
            <GridIcon data-icon="inline-start" />
            Show all {photos.length} photos
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="bg-background max-w-5xl gap-3 p-3 sm:p-4"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") step(1);
            if (e.key === "ArrowLeft") step(-1);
          }}
        >
          <DialogTitle className="pr-8 text-base">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Photo viewer. Use the left and right arrow keys to browse.
          </DialogDescription>
          <div className="bg-muted relative aspect-[3/2] w-full overflow-hidden rounded-lg">
            <CloudImage
              src={current.public_id}
              alt={alt(current, index)}
              fill
              sizes="(min-width: 1024px) 960px, 100vw"
              className="object-contain"
            />
          </div>
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={() => step(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeftIcon />
            </Button>
            <p className="text-sm" aria-live="polite">
              {index + 1} / {photos.length}
              {current.alt_text ? ` · ${current.alt_text}` : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={() => step(1)}
              aria-label="Next photo"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
