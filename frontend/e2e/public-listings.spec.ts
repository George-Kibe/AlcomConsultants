/**
 * Full-stack: public search and property pages against demo data
 * (E2E_FULLSTACK=1; CI runs `manage.py seed_demo_listings`).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const VILLA = "4 Bedroom Villa with Pool";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .exclude(".leaflet-container") // third-party map tiles/controls
    .analyze();
  return results.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id} ${n.target.join(" ")}`),
  );
}

test("home shows real featured listings", async ({ page }) => {
  await page.goto("/");
  const featured = page.getByRole("region", { name: "Featured properties" });
  await expect(featured.getByRole("article")).toHaveCount(6);
  await featured.getByRole("link", { name: VILLA }).click();
  await expect(page).toHaveURL(
    /\/properties\/4-bedroom-villa-with-pool-alc-s-\d+$/,
  );
});

test("search with deal tabs, location autocomplete and URL filters", async ({
  page,
  isMobile,
}) => {
  await page.goto("/properties");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Properties for sale and rent in Kenya",
  );
  await expect(page.getByRole("status")).toHaveText(/\d+ properties/);
  expect(await axe(page)).toEqual([]);

  await page.getByRole("button", { name: "Rent", exact: true }).click();
  await expect(page).toHaveURL(/deal=rent/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Properties for rent in Kenya",
  );

  const location = page.getByRole("combobox", { name: "Location or keyword" });
  await location.fill("Kilim");
  await page.getByRole("option", { name: /Kilimani, Nairobi/ }).click();
  await expect(page).toHaveURL(/area=kilimani/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Properties for rent in Kilimani",
  );
  const results = page
    .getByRole("region", { name: "Search results" })
    .getByRole("article");
  await expect(results.first()).toContainText("Kilimani, Nairobi");

  // Filters live in the panel on small screens; check one through the UI.
  if (isMobile) {
    await page.getByRole("button", { name: /^Filters/ }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await page.keyboard.press("Escape");
  }

  await page.goto("/properties?deal=sale&min_beds=4");
  const cards = page
    .getByRole("region", { name: "Search results" })
    .getByRole("article");
  await expect(cards.first()).toBeVisible();
  for (const text of await cards.allInnerTexts()) {
    const beds = Number(
      text
        .match(/(\d+)\s*bedrooms?|(\d+)\s*bd/)
        ?.slice(1)
        .find(Boolean),
    );
    expect(beds).toBeGreaterThanOrEqual(4);
  }

  await page.goto("/properties?q=nothing-matches-this");
  await expect(
    page.getByRole("heading", { name: "No properties match your search" }),
  ).toBeVisible();
});

test("map view shows clustered markers", async ({ page }) => {
  await page.goto("/properties?view=map");
  const map = page.getByLabel("Map of matching properties");
  await expect(map).toBeVisible();
  await expect(
    map.locator(".map-cluster-pin, .map-price-pin").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search this area" }),
  ).toHaveCount(0);
});

test("property page", async ({ page }) => {
  await page.goto("/properties?q=villa");
  await page.getByRole("link", { name: VILLA }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(VILLA);
  await expect(page.getByText("KES 85,000,000").first()).toBeVisible();
  const reference = (await page
    .getByText(/^ALC-S-\d+$/)
    .first()
    .textContent())!.trim();

  // Structured data for search engines.
  const ld = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect(ld).toMatchObject({
    "@type": "RealEstateListing",
    name: VILLA,
    offers: { priceCurrency: "KES" },
  });

  // Contact: WhatsApp is pre-filled with the reference.
  const whatsapp = page
    .getByRole("complementary", { name: "Contact" })
    .getByRole("link", { name: "WhatsApp" });
  expect(decodeURIComponent((await whatsapp.getAttribute("href"))!)).toContain(
    reference,
  );

  // Gallery viewer.
  await page
    .getByRole("button", { name: /Open photo 1 of 3/ })
    .filter({ visible: true })
    .first()
    .click();
  const viewer = page.getByRole("dialog");
  await expect(viewer.getByText(/^1 \/ 3/)).toBeVisible();
  await viewer.getByRole("button", { name: "Next photo" }).click();
  await expect(viewer.getByText(/^2 \/ 3/)).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(
    page.getByRole("heading", { name: "What this place offers" }),
  ).toBeVisible();
  await expect(page.getByLabel(/Map of Karen, Nairobi/)).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Similar properties" })
      .getByRole("article")
      .first(),
  ).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("unknown listing is a 404", async ({ page }) => {
  const response = await page.goto("/properties/no-such-property-alc-s-1");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /couldn.t find that page/,
  );
});
