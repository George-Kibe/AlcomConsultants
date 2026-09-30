import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { HeroSlideshow } from "@/components/site/hero-slideshow";
import { heroSlides } from "@/lib/hero-slides";
import { mediaMatches } from "@/vitest.setup";

const REDUCED = "(prefers-reduced-motion: reduce)";

function currentDot() {
  return screen
    .getAllByRole("button", { name: /^Show photo/ })
    .findIndex((b) => b.getAttribute("aria-current") === "true");
}

describe("HeroSlideshow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    mediaMatches.clear();
  });

  test("has ten slides and loads only the first two up front", () => {
    const { container } = render(<HeroSlideshow slides={heroSlides} />);

    expect(heroSlides).toHaveLength(10);
    expect(screen.getAllByRole("button", { name: /^Show photo/ })).toHaveLength(
      10,
    );
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  test("advances automatically and preloads one slide ahead", () => {
    const { container } = render(<HeroSlideshow slides={heroSlides} />);

    act(() => vi.advanceTimersByTime(6000));

    expect(currentDot()).toBe(1);
    expect(container.querySelectorAll("img")).toHaveLength(3);
  });

  test("pause stops autoplay and play resumes it", () => {
    render(<HeroSlideshow slides={heroSlides} />);

    fireEvent.click(screen.getByRole("button", { name: "Pause slideshow" }));
    act(() => vi.advanceTimersByTime(20000));
    expect(currentDot()).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Play slideshow" }));
    act(() => vi.advanceTimersByTime(6000));
    expect(currentDot()).toBe(1);
  });

  test("dots jump to a slide and wrap around at the end", () => {
    render(<HeroSlideshow slides={heroSlides} />);

    fireEvent.click(
      screen.getByRole("button", { name: /^Show photo 10 of 10/ }),
    );
    expect(currentDot()).toBe(9);

    act(() => vi.advanceTimersByTime(6000));
    expect(currentDot()).toBe(0);
  });

  test("does not autoplay when the user prefers reduced motion", () => {
    mediaMatches.set(REDUCED, true);
    render(<HeroSlideshow slides={heroSlides} />);

    expect(
      screen.getByRole("button", { name: "Play slideshow" }),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(20000));
    expect(currentDot()).toBe(0);
  });
});
