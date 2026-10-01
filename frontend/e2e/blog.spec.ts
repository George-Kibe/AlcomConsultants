/**
 * Full-stack: the public blog (demo articles from `seed_demo_listings`) and writing,
 * publishing and removing an article in the dashboard (E2E_FULLSTACK=1).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { JPEG, MOCK_SECRET, mockCloudinary, signIn } from "./helpers";

async function axe(page: Page) {
  // Dynamic pages stream their <title> after the HTML; scan once it has arrived.
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return results.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id} ${n.target.join(" ")}`),
  );
}

test("blog index and article", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Blog");
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  expect(await axe(page)).toEqual([]);

  await page
    .getByRole("link", { name: "What to check before buying land in Kenya" })
    .click();
  await expect(page).toHaveURL(
    /\/blog\/what-to-check-before-buying-land-in-kenya$/,
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "What to check before buying land in Kenya",
  );
  await expect(
    page.getByRole("heading", { level: 2, name: "1. Run an official search" }),
  ).toBeVisible();
  const ld = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect(ld).toMatchObject({
    "@type": "BlogPosting",
    headline: "What to check before buying land in Kenya",
  });
  await expect(
    page.getByRole("region", { name: "More articles" }).getByRole("article"),
  ).toHaveCount(2);
  expect(await axe(page)).toEqual([]);

  const missing = await page.goto("/blog/no-such-article");
  expect(missing?.status()).toBe(404);
});

test("write, publish, unpublish and delete an article", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Dashboard writing flow runs once, on desktop");
  const title = `E2E article ${Date.now()}`;
  await signIn(page, "/dashboard/blog");
  if (MOCK_SECRET) await mockCloudinary(page, "blog");

  await page.getByRole("link", { name: "Write an article" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  const body = page.getByRole("textbox", { name: "Body" });
  await body.click();
  await page.getByRole("button", { name: "Heading", exact: true }).click();
  await page.keyboard.type("Why it matters");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Plain words and ");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.keyboard.type("bold words");
  await expect(
    page.getByRole("button", { name: "Bold", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await axe(page)).toEqual([]);

  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.waitForURL(/\/dashboard\/blog\/[0-9a-f-]{36}$/);

  // Publishing needs a cover photo.
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Add a cover photo" }),
  ).toBeVisible();

  await page.getByLabel("Photo description").fill("Keys on a desk");
  const attached = page.waitForResponse(
    (r) => r.url().endsWith("/cover/") && r.request().method() === "POST",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "cover.jpg", mimeType: "image/jpeg", buffer: JPEG });
  expect((await attached).status()).toBe(200);
  await expect(
    page.getByRole("button", { name: "Replace photo", exact: true }),
  ).toBeVisible();

  const published = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.status() === 200,
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await published;
  await expect(page.getByText("Published", { exact: true })).toBeVisible();

  const slug = new URL(
    (await page
      .getByRole("link", { name: /View on site/ })
      .getAttribute("href"))!,
    page.url(),
  ).pathname;
  const article = await page.context().newPage();
  await article.goto(slug);
  await expect(article.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(article.locator(".rich-text h2")).toHaveText("Why it matters");
  await expect(article.locator(".rich-text strong")).toHaveText("bold words");
  await expect(
    article.getByRole("img", { name: "Keys on a desk" }),
  ).toBeVisible();

  // Unpublish: the article leaves the site.
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  const unpublished = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.status() === 200,
  );
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Unpublish", exact: true })
    .click();
  await unpublished;
  expect((await article.goto(slug))?.status()).toBe(404);

  // Drafts can be deleted.
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete draft", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/dashboard/blog");
  await expect(page.getByText(title)).toHaveCount(0);
});
