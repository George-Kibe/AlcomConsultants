/** Full-stack: staff create, publish, edit and remove listings (E2E_FULLSTACK=1). */
import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

/** Click "Save changes" and wait for the server to confirm. */
async function saveChanges(page: Page) {
  const saved = page.waitForResponse(
    (r) =>
      r.request().method() === "PATCH" &&
      r.url().includes("/api/v1/dashboard/properties/"),
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  expect((await saved).ok()).toBe(true);
}

async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}

test("create, publish, edit and archive a listing", async ({
  page,
  request,
}) => {
  const title = `E2E Garden Villa ${Date.now()}`;
  await signIn(page);
  await page.getByRole("link", { name: "Add property" }).click();
  await expect(
    page.getByRole("heading", { name: "Add a property" }),
  ).toBeVisible();

  // Validation: nothing filled in.
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("At least 5 characters")).toBeVisible();
  await expect(
    page.getByText("Choose a county", { exact: true }),
  ).toBeVisible();

  await page.getByLabel("Title", { exact: true }).fill(title);
  await choose(page, "Property type", /^Villa/);
  await page
    .getByLabel("Description", { exact: true })
    .fill("A beautiful villa with a large garden and pool.");
  await page.getByLabel("Price (KES)", { exact: true }).fill("85000000");
  await page.getByLabel("Bedrooms", { exact: true }).fill("4");
  await page.getByText("Swimming Pool").click();
  await choose(page, "County", "Nairobi");
  await choose(page, "Area", "Karen");
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page.getByText(/ALC-S-\d+ created and published/)).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/properties\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // It's on the public API.
  const search = await request.get(
    `/api/v1/properties/?q=${encodeURIComponent(title)}`,
  );
  const found = (await search.json()).results;
  expect(found).toHaveLength(1);
  expect(found[0]).toMatchObject({
    deal_type: "sale",
    price: 85000000,
    bedrooms: 4,
  });

  // Edit.
  await page.getByLabel("Price (KES)", { exact: true }).fill("82000000");
  await saveChanges(page);
  await expect(page.getByRole("button", { name: "Saved" })).toBeDisabled();

  // Archive (published listings can't be deleted).
  await choose(page, "Status", "Archived");
  await saveChanges(page);
  const after = await request.get(
    `/api/v1/properties/?q=${encodeURIComponent(title)}`,
  );
  expect((await after.json()).results).toHaveLength(0);

  // Listed under the Archived tab.
  await page.goto("/dashboard/properties?status=archived");
  await expect(
    page.getByRole("link", { name: new RegExp(title) }),
  ).toBeVisible();
});

test("save a draft, then delete it", async ({ page }) => {
  const title = `E2E Draft Plot ${Date.now()}`;
  await signIn(page);
  await page.goto("/dashboard/properties/new");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await choose(page, "Deal", "For sale");
  await choose(page, "Property type", /^Residential Land/);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Quarter-acre plot in a gated community, ready title.");
  await page.getByText("Price on request (don't show a price)").click();
  await choose(page, "County", "Kajiado");
  await choose(page, "Area", "Kitengela");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByText(/created as a draft/)).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/dashboard\/properties$/);
  await page.getByLabel("Search properties", { exact: true }).fill(title);
  await expect(page.getByText("No properties match.")).toBeVisible();
});
