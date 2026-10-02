"use client";

import { ChevronLeftIcon, ChevronRightIcon, ImageOffIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { CloudImage } from "@/components/cloud-image";
import { cn } from "@/lib/utils";

type Photo = { public_id: string; alt_text: string };

/** At most this many dots; the window slides along like Airbnb's. */
const MAX_DOTS = 5;

/**
 * A property card's photos: swipe (touch) or use the chevrons (mouse, keyboard) to
 * browse; tapping a photo opens the property. Photos after the first load lazily, as
 * they scroll into view.
 */
export function CardGallery({
  photos,
  href,
  title,
  sizes,
}: {
  photos: Photo[];
  href: string;
  title: string;
  sizes: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = photos.length;

  if (count === 0) {
    return (
      <span className="text-muted-foreground flex h-full items-center justify-center">
        <ImageOffIcon className="size-8" aria-label="No photo yet" />
      </span>
    );
  }

  const go = (e: React.SyntheticEvent, step: number) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scroller.current;
    if (!el) return;
    const next = Math.min(count - 1, Math.max(0, index + step));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next); // the scroll handler confirms once the scroll settles
  };

  const first = Math.min(
    Math.max(0, index - Math.floor(MAX_DOTS / 2)),
    Math.max(0, count - MAX_DOTS),
  );
  const dots = Array.from(
    { length: Math.min(count, MAX_DOTS) },
    (_, i) => first + i,
  );
  const chevron =
    "bg-background/90 text-foreground hover:bg-background focus-visible:ring-ring/50 absolute top-1/2 z-[2] flex size-8 -translate-y-1/2 items-center justify-center rounded-full shadow-md outline-none transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-has-[:focus-visible]:opacity-100 [@media(hover:none)]:hidden";

  return (
    <>
      <div
        ref={scroller}
        // One tab stop per card for keyboard users: focus the photos, then use the
        // arrow keys (the chevrons are for the mouse).
        tabIndex={count > 1 ? 0 : -1}
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos of ${title}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(e, 1);
          if (e.key === "ArrowLeft") go(e, -1);
        }}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        // Above the card's stretched link, so swipes scroll the photos.
        className="focus-visible:ring-ring/60 relative z-[1] flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-3 focus-visible:ring-inset [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <Link
            key={photo.public_id + i}
            href={href}
            tabIndex={-1}
            aria-hidden
            className="relative h-full w-full shrink-0 snap-center snap-always"
          >
            <CloudImage
              src={photo.public_id}
              alt=""
              fill
              sizes={sizes}
              loading={i === 0 ? undefined : "lazy"}
              className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
            />
          </Link>
        ))}
      </div>
      {count > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => go(e, -1)}
              aria-label={`Previous photo of ${title}`}
              className={cn(chevron, "left-2")}
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
            </button>
          )}
          {index < count - 1 && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => go(e, 1)}
              aria-label={`Next photo of ${title}`}
              className={cn(chevron, "right-2")}
            >
              <ChevronRightIcon className="size-4" aria-hidden />
            </button>
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-3 z-[2] flex items-center justify-center gap-1.5"
          >
            {dots.map((n) => (
              <span
                key={n}
                className={cn(
                  "rounded-full bg-white shadow-sm transition-all",
                  n === index ? "size-2 opacity-100" : "size-1.5 opacity-60",
                  // Edge dots shrink when there are more photos beyond them.
                  n !== index &&
                    ((n === dots[0] && n > 0) ||
                      (n === dots[dots.length - 1] && n < count - 1)) &&
                    "size-1",
                )}
              />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            Photo {index + 1} of {count}
          </span>
        </>
      )}
    </>
  );
}
