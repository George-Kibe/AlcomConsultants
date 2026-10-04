/**
 * Full-stack: the public blog (demo articles from `seed_demo_listings`) and writing,
 * publishing and removing an article in the dashboard (E2E_FULLSTACK=1).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  JPEG,
  MOCK_SECRET,
  emailConfirmationKey,
  mockCloudinary,
  signIn,
} from "./helpers";

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
  await expect(cards).toHaveCount(5);
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
  ).toHaveCount(3);
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

  // Delete from the edit page.
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page.waitForURL((url) => url.pathname === "/dashboard/blog");
  await expect(page.getByText(title)).toHaveCount(0);
});

test("a new article gets its cover before the first save and publishes at once", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Dashboard writing flow runs once, on desktop");
  const title = `E2E cover-first article ${Date.now()}`;
  await signIn(page, "/dashboard/blog/new");
  if (MOCK_SECRET) await mockCloudinary(page, "blog");

  await page.getByLabel("Title", { exact: true }).fill(title);
  const body = page.getByRole("textbox", { name: "Body" });
  await body.click();
  await page.keyboard.type("Written and published in one go.");
  await page.getByLabel("Photo description").fill("Keys on a desk");
  await expect(
    page.getByRole("button", { name: /Add a cover photo/ }),
  ).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "cover.jpg", mimeType: "image/jpeg", buffer: JPEG });
  await expect(
    page.getByRole("button", { name: "Replace photo", exact: true }),
  ).toBeVisible();

  const created = page.waitForResponse(
    (r) =>
      r.url().endsWith("/dashboard/blog/posts/") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  expect((await created).status()).toBe(201);
  await page.waitForURL(/\/dashboard\/blog\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  const href = (await page
    .getByRole("link", { name: /View on site/ })
    .getAttribute("href"))!;
  const article = await page.context().newPage();
  await article.goto(href);
  await expect(article.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(
    article.getByRole("img", { name: "Keys on a desk" }),
  ).toBeVisible();
  await article.close();

  // Published articles can be deleted straight from the list.
  await page.goto("/dashboard/blog");
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Article deleted")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(
    0,
  );
  expect((await page.request.get(href)).status()).toBe(404);
});

test("readers sign up, confirm their email and comment; staff can hide comments", async ({
  page,
  browser,
  isMobile,
}) => {
  test.skip(isMobile, "Account flow runs once, on desktop");
  const article = "/blog/why-a-professional-valuation-matters";
  const email = `reader-${Date.now()}@example.com`;
  const text = `Very clear, thank you ${Date.now()}`;

  // Signed out: an invitation to join, no comment box.
  await page.goto(`${article}#comments`);
  const comments = page.getByRole("region", { name: /^Comments/ });
  await expect(
    comments.getByText("Sign in to join the conversation."),
  ).toBeVisible();

  await comments.getByRole("link", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Create an account",
  );
  expect(await axe(page)).toEqual([]);
  await page.getByLabel("Your name").fill("Esther Njeri");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Reader-pass-2026");
  await page.getByLabel("Confirm password").fill("Reader-pass-2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  // Signed in but unconfirmed: asked to confirm first.
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(
    page.getByText("Please confirm your email address to comment."),
  ).toBeVisible();

  // The emailed link opens the verify page, which confirms and returns to the article.
  await page.goto(
    `/account/verify-email/${encodeURIComponent(emailConfirmationKey(email))}`,
  );
  await expect(
    page.getByRole("heading", { name: "Email confirmed" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(new RegExp(`${article}#comments$`));

  await page.getByLabel("Comment as Esther Njeri").fill(text);
  await page.getByRole("button", { name: "Post comment" }).click();
  const mine = page.getByRole("listitem").filter({ hasText: text });
  await expect(mine).toContainText("Esther N.");
  expect(await axe(page)).toEqual([]);

  // Staff hide it from the dashboard; it disappears from the article.
  const staff = await browser.newPage();
  await signIn(staff, "/dashboard/blog/comments");
  await staff.getByLabel("Search comments").fill(text);
  const row = staff.getByRole("listitem").filter({ hasText: text });
  await row.getByRole("button", { name: "Hide" }).click();
  await expect(row.getByText(/^Hidden by/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(text)).toHaveCount(0);

  // Clean up.
  await row.getByRole("button", { name: "Delete" }).click();
  await staff.getByRole("button", { name: "Delete comment" }).click();
  await expect(staff.getByText(text)).toHaveCount(0);
  await staff.close();
});
