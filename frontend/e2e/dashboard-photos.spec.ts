/**
 * Full-stack: photo upload, cover, alt text, reorder and delete (E2E_FULLSTACK=1).
 * Cloudinary uploads are mocked in CI (see helpers.ts).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  JPEG,
  MOCK_SECRET,
  csrfToken,
  mockCloudinary,
  signIn,
} from "./helpers";

async function createDraft(page: Page): Promise<string> {
  const csrf = await csrfToken(page);
  const lookups = await (
    await page.request.get("/api/v1/dashboard/lookups/")
  ).json();
  const nairobi = lookups.counties.find(
    (c: { name: string }) => c.name === "Nairobi",
  );
  const response = await page.request.post("/api/v1/dashboard/properties/", {
    headers: { "X-CSRFToken": csrf },
    data: {
      title: `E2E Photo Test ${Date.now()}`,
      description: "Listing used by the photo upload test.",
      deal_type: "rent",
      property_type: "apartment",
      price: 100000,
      price_unit: "per_month",
      area: nairobi.areas[0].id,
      status: "draft",
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).uuid;
}

test("upload photos, set the cover, describe, reorder and delete", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page);
  if (MOCK_SECRET) await mockCloudinary(page, "properties");
  const uuid = await createDraft(page);
  await page.goto(`/dashboard/properties/${uuid}`);

  await page.getByLabel("Upload photos").setInputFiles([
    { name: "front.jpg", mimeType: "image/jpeg", buffer: JPEG },
    { name: "kitchen.jpg", mimeType: "image/jpeg", buffer: JPEG },
  ]);
  const photos = page
    .getByRole("list", { name: "Photos" })
    .getByRole("listitem");
  await expect(photos).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByText(/2 photos added/)).toBeVisible();
  await expect(photos.first().getByText("Cover")).toBeVisible();

  // A non-photo is refused before uploading.
  await page.getByLabel("Upload photos").setInputFiles({
    name: "brochure.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await expect(
    page.getByText("Only photos (JPG, PNG, WebP, AVIF, HEIC) can be uploaded."),
  ).toBeVisible();

  // Describe the second photo (saved on blur) and make it the cover.
  await page.getByLabel("Describe Photo 2", { exact: true }).fill("Kitchen");
  await page.getByLabel("Describe Photo 2", { exact: true }).blur();
  await expect(
    page.getByRole("button", { name: "Make Photo 2: Kitchen the cover photo" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Make Photo 2: Kitchen the cover photo" })
    .click();
  await expect(photos.first()).toHaveAccessibleName("Photo 1: Kitchen");
  await expect(photos.first().getByText("Cover")).toBeVisible();

  // Keyboard reordering: move the cover one place to the right.
  await page.getByRole("button", { name: "Move Photo 1: Kitchen" }).focus();
  // Pause between keys like a person: dnd-kit measures positions after pick-up.
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await expect(photos.nth(1)).toHaveAccessibleName("Photo 2: Kitchen");

  // Delete one photo.
  await page.getByRole("button", { name: "Delete Photo 1" }).click();
  await page.getByRole("button", { name: "Delete photo" }).click();
  await expect(photos).toHaveCount(1);

  // Clean up the draft (and its remaining photo).
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.waitForURL((url) => url.pathname === "/dashboard/properties");
});
