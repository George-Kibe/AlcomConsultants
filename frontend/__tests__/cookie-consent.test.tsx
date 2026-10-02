import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("next/script", () => ({
  default: ({ id, src }: { id?: string; src?: string }) => (
    <span data-testid="script" data-id={id} data-src={src} />
  ),
}));

async function load(gaId: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GA_ID", gaId);
  return import("@/components/site/cookie-consent");
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllEnvs());

test("without a GA4 ID there is no banner and nothing loads", async () => {
  const { CookieConsent, CookieSettingsLink } = await load("");
  render(
    <>
      <CookieConsent />
      <CookieSettingsLink />
    </>,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByText("Cookie settings")).toBeNull();
  expect(screen.queryByTestId("script")).toBeNull();
});

test("analytics loads only after the visitor accepts, and the choice is kept", async () => {
  const { CookieConsent, CookieSettingsLink } = await load("G-TEST123");
  const { unmount } = render(
    <>
      <CookieConsent />
      <CookieSettingsLink />
    </>,
  );
  expect(
    await screen.findByRole("dialog", { name: "Cookies on this website" }),
  ).toBeInTheDocument();
  expect(screen.queryByTestId("script")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Accept analytics" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  const scripts = screen.getAllByTestId("script");
  expect(scripts[0]).toHaveAttribute(
    "data-src",
    "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
  );
  expect(
    JSON.parse(localStorage.getItem("alcom:cookie-consent")!).analytics,
  ).toBe(true);
  unmount();

  // Next visit: no banner, analytics on; "Cookie settings" reopens the choice.
  render(
    <>
      <CookieConsent />
      <CookieSettingsLink />
    </>,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Essential only" }),
  );
  expect(screen.queryByTestId("script")).toBeNull();
  expect(
    JSON.parse(localStorage.getItem("alcom:cookie-consent")!).analytics,
  ).toBe(false);
});
