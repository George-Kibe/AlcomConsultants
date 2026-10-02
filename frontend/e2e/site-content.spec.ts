/**
 * Full-stack: staff edit the team, testimonials, FAQs and job openings in the dashboard and
 * they appear on the website (E2E_FULLSTACK=1).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { JPEG, MOCK_SECRET, mockCloudinary, signIn } from "./helpers";

async function axe(page: Page) {
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .exclude("[data-sonner-toaster]")
    .analyze();
  return results.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id} ${n.target.join(" ")}`),
  );
}

test("staff manage site content and it shows on the website", async ({
  page,
  browser,
  isMobile,
}) => {
  test.skip(isMobile, "Dashboard flow runs once, on desktop");
  const stamp = Date.now();
  const person = `Wairimu Test ${stamp}`;
  const client = `Client ${stamp}`;
  const question = `Do you test FAQs ${stamp}?`;
  const role = `Test Role ${stamp}`;

  await signIn(page, "/dashboard/content");
  await expect(page).toHaveURL(/\/dashboard\/content\/team$/);
  if (MOCK_SECRET) await mockCloudinary(page, "team");

  // Team member with a photo.
  await page.getByRole("button", { name: "Add team member" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: "me.jpg", mimeType: "image/jpeg", buffer: JPEG });
  await expect(
    dialog.getByRole("button", { name: "Change photo" }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await dialog.getByLabel("Name", { exact: true }).fill(person);
  await dialog.getByLabel("Role", { exact: true }).fill("Registered Valuer");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(person)).toBeVisible();
  expect(await axe(page)).toEqual([]);

  // Testimonial.
  await page.getByRole("link", { name: "Testimonials" }).click();
  await page.getByRole("button", { name: "Add testimonial" }).click();
  await dialog.getByLabel("Quote").fill(`Excellent valuation work ${stamp}.`);
  await dialog.getByLabel("Client name").fill(client);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(client)).toBeVisible();

  // FAQ, moved to the top.
  await page.getByRole("link", { name: "FAQs" }).click();
  await page.getByRole("button", { name: "Add FAQ" }).click();
  await dialog.getByLabel("Question").fill(question);
  await dialog.getByLabel("Answer").fill("Yes, end to end.");
  await dialog.getByRole("button", { name: "Save" }).click();
  const faqs = page.getByRole("list", { name: "FAQs" }).getByRole("listitem");
  await expect(faqs.last()).toContainText(question);
  const count = await faqs.count();
  for (let i = 0; i < count - 1; i++)
    await page.getByRole("button", { name: `Move ${question} up` }).click();
  await expect(faqs.first()).toContainText(question);

  // Job opening, published.
  await page.getByRole("link", { name: "Careers" }).click();
  await page.getByRole("link", { name: "Add job opening" }).click();
  await page.getByLabel("Job title").fill(role);
  await page.getByLabel("Summary").fill("Join our valuation team.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForURL(/\/dashboard\/content\/careers\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("link", { name: /View on site/ })).toBeVisible();

  // The website.
  const site = await (await browser.newContext()).newPage();
  await site.goto("/about");
  await expect(site.getByRole("heading", { name: "Our team" })).toBeVisible();
  await expect(site.getByText(person)).toBeVisible();
  await expect(site.getByText(client)).toBeVisible();
  expect(await axe(site)).toEqual([]);
  await site.goto("/contact");
  await expect(site.locator("#faqs").getByRole("button").first()).toHaveText(
    question,
  );
  await site.goto("/careers");
  await site.getByRole("link", { name: new RegExp(role) }).click();
  await expect(site.getByRole("heading", { level: 1 })).toHaveText(role);
  await expect(
    site.getByRole("link", { name: "Apply by email" }),
  ).toHaveAttribute(
    "href",
    /^mailto:info@alcomconsultants\.co\.ke\?subject=Application/,
  );
  expect(await axe(site)).toEqual([]);

  // Clean up: delete everything created above.
  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await page.waitForURL(/\/dashboard\/content\/careers$/);
  for (const [tab, name] of [
    ["FAQs", question],
    ["Testimonials", `testimonial from ${client}`],
    ["Team", person],
  ]) {
    await page.getByRole("link", { name: tab, exact: true }).click();
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(
      page.getByRole("button", { name: `Delete ${name}` }),
    ).toHaveCount(0);
  }
});
