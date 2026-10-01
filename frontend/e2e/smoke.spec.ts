import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", h1: /We find, manage, sell and value property/ },
  { path: "/properties", h1: "Properties for sale and rent in Kenya" },
  { path: "/services", h1: "Our services" },
  { path: "/services/property-agency", h1: "Estate Agency" },
  { path: "/services/property-management", h1: "Property Management" },
  { path: "/services/property-valuations", h1: "Valuation Services" },
  { path: "/about", h1: "About us" },
  { path: "/blog", h1: "Blog" },
  { path: "/contact", h1: "Contact us" },
  { path: "/privacy", h1: "Privacy Policy" },
  { path: "/terms", h1: "Terms of Use" },
  { path: "/cookies", h1: "Cookie Policy" },
];

for (const { path, h1 } of pages) {
  test(`${path} renders and has no accessibility violations`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
    await expect(page).toHaveTitle(/Alcom Consultants/);

    for (const theme of ["light", "dark"]) {
      // Apply the theme like a returning visitor (stored preference + reload), so CSS
      // transitions are not mid-flight when colours are measured.
      await page.evaluate((t) => localStorage.setItem("theme", t), theme);
      await page.reload();
      await expect(page.locator("html")).toHaveClass(
        theme === "dark" ? /dark/ : /^(?!.*dark)/,
      );
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const summary = results.violations.flatMap((v) =>
        v.nodes.map(
          (n) =>
            `${v.id} [${theme}] ${n.target.join(" ")}: ${n.failureSummary}`,
        ),
      );
      expect(summary).toEqual([]);
    }
  });
}

test("unknown pages show the 404 page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /couldn.t find that page/,
  );
});

test("hero search hands off to the properties page", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Rent", { exact: true }).click();
  await page.getByRole("searchbox", { name: "Location" }).fill("Kilimani");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/properties\?deal=rent&q=Kilimani/);
});

test("theme toggle switches to dark mode and persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("navigation works on this viewport", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Services" })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Services" })
      .click();
  }
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Our services",
  );
});

test("hero slideshow rotates and can be paused", async ({ page }) => {
  await page.goto("/");
  const current = page.locator(
    'button[aria-label^="Show photo"][aria-current="true"]',
  );
  await expect(current).toHaveAttribute("aria-label", /^Show photo 1 of 10/);

  await expect(current).toHaveAttribute("aria-label", /^Show photo 2 of 10/, {
    timeout: 6000,
  });

  await page.getByRole("button", { name: "Pause slideshow" }).click();
  await page.waitForTimeout(4500);
  await expect(current).toHaveAttribute("aria-label", /^Show photo 2 of 10/);
});

test("hero images load from Cloudinary", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("section").first().locator("img").first();
  await expect(hero).toBeVisible();
  await expect
    .poll(() =>
      hero.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  expect(
    await hero.evaluate((img: HTMLImageElement) => img.currentSrc),
  ).toContain("res.cloudinary.com/ictdclhd");
});

test("search page explains when listings can't be loaded", async ({ page }) => {
  // In this suite there is no API behind the site.
  await page.goto("/properties?deal=rent");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Properties for rent in Kenya",
  );
  await expect(
    page.getByRole("heading", { name: "Listings are temporarily unavailable" }),
  ).toBeVisible();
});
