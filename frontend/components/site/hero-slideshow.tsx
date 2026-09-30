"use client";

import Image from "next/image";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "cn";

import type { HeroSlide } from "@/lib/hero-slides";

const INTERVAL_MS = 6000;

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function usePageHidden() {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  );
}

type HeroSlideshowProps = {
  slides: HeroSlide[];
  /** Classes for the controls wrapper, so the page can position it. */
  controlsClassName?: string;
};

/**
 * Crossfading background slideshow.
 * - Only the first slide loads up front; each next slide is fetched one step ahead.
 * - Pauses while the tab is hidden, and never autoplays for reduced-motion users.
 * - A visible pause/play button satisfies WCAG 2.2.2 (Pause, Stop, Hide).
 */
export function HeroSlideshow({
  slides,
  controlsClassName,
}: HeroSlideshowProps) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(() => new Set([0, 1]));
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const hidden = usePageHidden();

  const paused = userPaused ?? reducedMotion;
  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      const i = (next + count) % count;
      setIndex(i);
      setMounted((prev) =>
        prev.has(i) && prev.has((i + 1) % count)
          ? prev
          : new Set([...prev, i, (i + 1) % count]),
      );
    },
    [count],
  );

  useEffect(() => {
    if (paused || hidden || count < 2) return;
    const timer = window.setTimeout(() => goTo(index + 1), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, hidden, count, goTo]);

  return (
    <>
      <div
        aria-hidden
        className="bg-brand-navy absolute inset-0 -z-20 overflow-hidden"
      >
        {slides.map((slide, i) =>
          mounted.has(i) ? (
            <Image
              key={slide.src}
              src={slide.src}
              alt=""
              fill
              sizes="100vw"
              preload={i === 0}
              loading={i === 0 ? undefined : "eager"}
              placeholder="blur"
              blurDataURL={slide.blurDataURL}
              className={cn(
                "object-cover transition-[opacity,scale] ease-out motion-reduce:transition-none",
                i === index
                  ? "scale-110 opacity-100 duration-[1200ms,7000ms] motion-reduce:scale-100"
                  : "scale-100 opacity-0 duration-[1200ms,0ms]",
              )}
            />
          ) : null,
        )}
      </div>

      {count > 1 && (
        <div
          role="group"
          aria-label="Background photos"
          className={cn(
            "flex items-center gap-1 rounded-full bg-black/30 p-1 backdrop-blur",
            controlsClassName,
          )}
        >
          <button
            type="button"
            onClick={() => setUserPaused(!paused)}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            className="flex size-9 items-center justify-center rounded-full text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white"
          >
            {paused ? (
              <PlayIcon className="size-4" />
            ) : (
              <PauseIcon className="size-4" />
            )}
          </button>
          <ol className="flex items-center">
            {slides.map((slide, i) => (
              <li key={slide.src}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show photo ${i + 1} of ${count}: ${slide.alt}`}
                  aria-current={i === index ? "true" : undefined}
                  className="group flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full bg-white transition-all motion-reduce:transition-none",
                      i === index
                        ? "w-4 opacity-100"
                        : "w-1.5 opacity-50 group-hover:opacity-80",
                    )}
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
