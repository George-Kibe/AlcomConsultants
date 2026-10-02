/**
 * Full-stack: what search engines see (E2E_FULLSTACK=1, demo listings from
 * `seed_demo_listings`, which are kept out of the index).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function structuredData(page: Page) {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return blocks.map((b) => JSON.parse(b) as { "@type": string });
}

test("home: keyword title, company and site search structured data", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/^Property for Sale & Rent in Kenya/);
  const types = (await structuredData(page)).map((d) => d["@type"]);
  expect(types).toEqual(expect.arrayContaining(["RealEstateAgent", "WebSite"]));
  await expect(
    page.getByRole("link", { name: "Realhive Consultants" }),
  ).toHaveAttribute("href", "https://www.realhiveconsultants.com/");
});

test("location landing page", async ({ page }) => {
  await page.goto("/properties");
  const browse = page.getByRole("region", { name: "Browse by location" });
  await expect(
    browse.getByRole("link", { name: /^Property for rent in / }).first(),
  ).toBeVisible();
  await page.goto("/property-for-rent/kilimani");
  await expect(page).toHaveURL(/\/property-for-rent\/kilimani$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Property for rent in Kilimani",
  );
  const cards = page
    .getByRole("region", { name: "Listings" })
    .getByRole("article");
  await expect(cards.first()).toBeVisible();
  for (const text of await cards.allInnerTexts())
    expect(text).toContain("Kilimani");
  const types = (await structuredData(page)).map((d) => d["@type"]);
  expect(types).toEqual(expect.arrayContaining(["ItemList", "BreadcrumbList"]));
  // What crawlers see: the page loaded directly has exactly one canonical URL.
  await page.goto("/property-for-rent/kilimani");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/property-for-rent\/kilimani$/,
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  expect((await page.goto("/property-for-sale/nowhere-at-all"))?.status()).toBe(
    404,
  );
});

test("demo data stays out of search engines", async ({ page, request }) => {
  await page.goto("/properties?q=villa");
  await page.getByRole("link", { name: "4 Bedroom Villa with Pool" }).click();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>");
  expect(sitemap).toMatch(/\/services\/land-survey<\/loc>/);
  expect(sitemap).not.toContain("4-bedroom-villa-with-pool");

  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toBe("image/png");
});
