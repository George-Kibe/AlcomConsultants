/** Shared helpers for the full-stack dashboard specs (E2E_FULLSTACK=1). */
import { createHash } from "node:crypto";

import type { Page } from "@playwright/test";

export const STAFF_EMAIL =
  process.env.E2E_STAFF_EMAIL ?? "e2e-staff@alcom.test";
export const STAFF_PASSWORD =
  process.env.E2E_STAFF_PASSWORD ?? "e2e-Staff-pass-2026";

/**
 * With E2E_CLOUDINARY_SECRET set (CI), uploads to Cloudinary are mocked with correctly
 * signed responses, so the server's signature check still runs; without it, real uploads.
 */
export const MOCK_SECRET = process.env.E2E_CLOUDINARY_SECRET;
/** `<CLOUDINARY_FOLDER>` of the stack under test (CI: a fake one). */
export const MOCK_ROOT = (
  process.env.E2E_CLOUDINARY_FOLDER ?? "alcom/dev/properties"
).replace(/\/properties$/, "");

// A tiny valid JPEG (8×8, grey).
export const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAAIAAgBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=",
  "base64",
);

export async function signIn(page: Page, next = "/dashboard/properties") {
  await page.goto(`/dashboard/login?next=${next}`);
  await page.getByLabel("Email", { exact: true }).fill(STAFF_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(STAFF_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === next);
}

export async function csrfToken(page: Page) {
  return (await page.context().cookies()).find((c) => c.name === "csrftoken")!
    .value;
}

/** Answer uploads to Cloudinary with signed results in `<root>/<target>/`. */
export async function mockCloudinary(page: Page, target: string) {
  let n = 0;
  await page.route("https://api.cloudinary.com/**", async (route) => {
    n += 1;
    const public_id = `${MOCK_ROOT}/${target}/e2e-${Date.now()}-${n}`;
    const version = 1_700_000_000 + n;
    const signature = createHash("sha1")
      .update(`public_id=${public_id}&version=${version}${MOCK_SECRET}`)
      .digest("hex");
    await route.fulfill({
      json: {
        public_id,
        version,
        signature,
        width: 8,
        height: 8,
        bytes: JPEG.length,
        format: "jpg",
      },
    });
  });
}
