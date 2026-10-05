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

  // Archive.
  await choose(page, "Status", "Archived");
  await saveChanges(page);
  const after = await request.get(
    `/api/v1/properties/?q=${encodeURIComponent(title)}`,
  );
  expect((await after.json()).results).toHaveLength(0);

  // Listed under the Archived tab, and can be deleted from the list.
  await page.goto("/dashboard/properties?status=archived");
  const row = page.getByRole("link", { name: new RegExp(title) });
  await expect(row).toBeVisible();
  await page
    .getByRole("listitem")
    .filter({ hasText: title })
    .getByRole("button", { name: /^Delete ALC-/ })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText(title);
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Listing deleted")).toBeVisible();
  await expect(row).toHaveCount(0);
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

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/properties$/);
  await page.getByLabel("Search properties", { exact: true }).fill(title);
  await expect(page.getByText("No properties match.")).toBeVisible();
});

test("type an unlisted area, preview, then publish from the preview", async ({
  page,
  request,
}) => {
  const title = `E2E Preview Cottage ${Date.now()}`;
  // A fixed name: later runs reuse the area instead of adding another.
  const area = "E2E Test Area";
  await signIn(page, "/dashboard/properties/new");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await choose(page, "Deal", "For sale");
  await choose(page, "Property type", /^Residential Land/);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Half-acre plot with a view, in an area not yet in the list.");
  await page.getByText("Price on request (don't show a price)").click();
  await choose(page, "County", "Kajiado");
  await choose(page, "Area", "Not listed? Type it…");
  await page.getByLabel("Area", { exact: true }).fill(area);

  // Saved as a draft, then shown as visitors would see it.
  await page.getByRole("button", { name: "Save and preview" }).click();
  await page.waitForURL(/\/dashboard\/properties\/[0-9a-f-]{36}\/preview$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByText(`${area}, Kajiado`).first()).toBeVisible();
  await expect(
    page.getByText(/Visitors can't, until you publish/),
  ).toBeVisible();
  const search = () =>
    request.get(`/api/v1/properties/?q=${encodeURIComponent(title)}`);
  expect((await (await search()).json()).results).toHaveLength(0);

  // The search card; its link opens the page preview, not the public page.
  await page.getByRole("button", { name: "Search card" }).click();
  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card).toBeVisible();
  await card.getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  expect(page.url()).toMatch(/\/preview$/);

  // Publish straight from the preview.
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByText("Published. It's now on the website."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /View on site/ })).toBeVisible();
  const found = (await (await search()).json()).results;
  expect(found).toHaveLength(1);
  expect(found[0].location.area).toBe(area);

  // The typed area is now in the list, selected on the edit page.
  await page.getByRole("link", { name: "Back to editing" }).click();
  // Wait for the refreshed listing (the form redraws when it arrives).
  await expect(page.getByLabel("Status", { exact: true })).toHaveText(
    "Published",
  );
  await expect(page.getByLabel("Area", { exact: true })).toHaveText(area);

  // Clean up.
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page.waitForURL((url) => url.pathname === "/dashboard/properties");
});
