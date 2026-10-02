import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { CardGallery } from "@/components/listings/card-gallery";

const photos = Array.from({ length: 7 }, (_, i) => ({
  public_id: `alcom/test/p${i}`,
  alt_text: `Photo ${i}`,
}));

test("chevrons move through the photos and the dots follow", () => {
  const { container } = render(
    <CardGallery
      photos={photos}
      href="/properties/x"
      title="Flat"
      sizes="100vw"
    />,
  );
  const scroller = container.querySelector("div")!;
  scroller.scrollTo = vi.fn();
  Object.defineProperty(scroller, "clientWidth", { value: 300 });

  // Never more than five dots.
  expect(container.querySelectorAll("[aria-hidden] > span")).toHaveLength(5);

  fireEvent.click(screen.getByRole("button", { name: "Next photo of Flat" }));
  expect(scroller.scrollTo).toHaveBeenCalledWith({
    left: 300,
    behavior: "smooth",
  });
  expect(screen.getByText("Photo 2 of 7")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Previous photo of Flat" }),
  ).toBeInTheDocument();

  // Swiping (scrolling) to the last photo hides "next".
  Object.defineProperty(scroller, "scrollLeft", {
    value: 1800,
    configurable: true,
  });
  fireEvent.scroll(scroller);
  expect(screen.getByText("Photo 7 of 7")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Next photo/ })).toBeNull();
});

test("every photo opens the property; one photo has no controls", () => {
  const { container } = render(
    <CardGallery
      photos={photos.slice(0, 1)}
      href="/properties/x"
      title="Flat"
      sizes="100vw"
    />,
  );
  expect(container.querySelector("a")).toHaveAttribute("href", "/properties/x");
  expect(screen.queryByRole("button")).toBeNull();
});
