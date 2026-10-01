import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { FavouriteButton } from "@/components/listings/favourite-button";

const push = vi.fn();
const mutate = vi.fn();
const state = {
  viewer: null as object | null,
  slugs: [] as string[],
};

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/visitor", () => ({
  useViewer: () => ({ data: state.viewer, isPending: false }),
  useFavouriteSlugs: (enabled: boolean) => ({
    data: enabled ? state.slugs : undefined,
    isSuccess: enabled,
  }),
  useToggleFavourite: () => ({ mutate }),
  useResolveViewer: () => async () => state.viewer,
}));

beforeEach(() => {
  push.mockClear();
  mutate.mockClear();
  sessionStorage.clear();
  state.viewer = null;
  state.slugs = [];
});

test("signed-out visitors are sent to sign in, and the save is remembered", async () => {
  window.history.replaceState(null, "", "/properties?deal=rent");
  render(<FavouriteButton slug="flat-alc-r-1" title="Flat" />);
  fireEvent.click(screen.getByRole("button", { name: "Save Flat" }));
  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(push).toHaveBeenCalledWith(
    "/account/sign-in?next=%2Fproperties%3Fdeal%3Drent",
  );
  expect(JSON.parse(sessionStorage.getItem("alcom:intent")!)).toEqual({
    kind: "favourite",
    slug: "flat-alc-r-1",
  });
  expect(mutate).not.toHaveBeenCalled();
});

test("back from signing in, the remembered property is saved once", () => {
  sessionStorage.setItem(
    "alcom:intent",
    JSON.stringify({ kind: "favourite", slug: "flat-alc-r-1" }),
  );
  state.viewer = { email: "esther@example.com" };
  render(
    <>
      <FavouriteButton slug="other-alc-r-2" title="Other" />
      <FavouriteButton slug="flat-alc-r-1" title="Flat" />
    </>,
  );
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(mutate.mock.calls[0][0]).toEqual({ slug: "flat-alc-r-1", save: true });
  expect(sessionStorage.getItem("alcom:intent")).toBeNull();
});

test("signed in: shows saved state and toggles", async () => {
  state.viewer = { email: "esther@example.com" };
  state.slugs = ["flat-alc-r-1"];
  render(
    <FavouriteButton slug="flat-alc-r-1" title="Flat" variant="labelled" />,
  );
  const button = screen.getByRole("button", { name: "Saved" });
  expect(button).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(button);
  await waitFor(() => expect(mutate).toHaveBeenCalled());
  expect(mutate.mock.calls[0][0]).toEqual({
    slug: "flat-alc-r-1",
    save: false,
  });
});
