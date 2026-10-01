/**
 * Full-stack: a visitor saves a property and a search (signing up on the way), manages
 * them in their account, updates their profile, downloads their data, stops alert emails
 * and deletes the account (E2E_FULLSTACK=1, demo listings from `seed_demo_listings`).
 */
import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { djangoShell } from "./helpers";

/** Toasts animate in and out, so pages are scanned without them (checked separately). */
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

test("save a property and a search, manage the account, then delete it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Account flow runs once, on desktop");
  const email = `visitor-${Date.now()}@example.com`;
  const password = "Visitor-pass-2026";

  // Signed out: the heart sends the visitor to sign in, then on to sign up.
  await page.goto("/properties?deal=rent");
  // Interactive once the header knows who's visiting.
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  const results = page
    .getByRole("region", { name: "Search results" })
    .getByRole("article");
  const firstCard = results.first();
  const title = (await firstCard.getByRole("heading").textContent())!.trim();
  await firstCard.getByRole("button", { name: `Save ${title}` }).click();
  await expect(page).toHaveURL(/\/account\/sign-in\?next=/);
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Wanjiku Kamau");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();

  // Back on the search: the property they tapped is saved.
  await expect(page).toHaveURL(/\/properties\?deal=rent$/);
  const heart = page
    .getByRole("region", { name: "Search results" })
    .getByRole("button", { name: `Save ${title}` });
  await expect(heart).toHaveAttribute("aria-pressed", "true");

  // Save the search.
  await page.getByRole("button", { name: "Save this search" }).click();
  await expect(page.getByRole("link", { name: "Search saved" })).toBeVisible();
  expect(await axe(page)).toEqual([]);

  // Toast colours meet contrast once the toast has finished appearing.
  const toast = page.locator("[data-sonner-toast]").first();
  await expect(toast).toHaveCSS("opacity", "1");
  const toastScan = await new AxeBuilder({ page })
    .include("[data-sonner-toaster]")
    .withTags(["wcag2aa"])
    .analyze();
  expect(toastScan.violations).toEqual([]);

  // Account menu → saved properties.
  await page.getByRole("button", { name: "Your account" }).click();
  await page.getByRole("menuitem", { name: "Saved properties" }).click();
  await expect(page).toHaveURL(/\/account\/favourites$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hello, Wanjiku" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  expect(await axe(page)).toEqual([]);

  // Saved searches: alerts need a confirmed email; switch the daily email off.
  await page.getByRole("link", { name: "Saved searches" }).click();
  await expect(
    page.getByRole("heading", { name: "Properties for rent in Kenya" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Confirm your email address to receive daily alerts/),
  ).toBeVisible();
  const daily = page.getByRole("switch", {
    name: "Daily email for Properties for rent in Kenya",
  });
  await expect(daily).toBeChecked();
  expect(await axe(page)).toEqual([]);
  await daily.click();
  await expect(daily).not.toBeChecked();
  await daily.click();
  await expect(daily).toBeChecked();

  // The unsubscribe link from an email switches every alert off.
  const token = djangoShell(
    `from apps.accounts.models import User; from apps.saved.alerts import unsubscribe_token; print(unsubscribe_token(User.objects.get(email="${email}")))`,
  )
    .split("\n")
    .pop()!;
  await page.goto(`/account/unsubscribe?token=${encodeURIComponent(token)}`);
  expect(await axe(page)).toEqual([]);
  await page.getByRole("button", { name: "Stop the emails" }).click();
  await expect(
    page.getByRole("heading", { name: "Emails stopped" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Manage saved searches" }).click();
  await expect(daily).not.toBeChecked();

  // Profile: details and email choices.
  await page.getByRole("link", { name: "Profile and settings" }).click();
  await page.getByLabel("Phone (optional)").fill("0712 345 678");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Details saved")).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "Send me occasional news and offers by email",
    })
    .click();
  await expect(page.getByText(/You agreed on/)).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.reload();
  await expect(page.getByLabel("Phone (optional)")).toHaveValue("0712 345 678");

  // Download my data.
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download my data" }).click();
  const data = JSON.parse(
    readFileSync((await (await download).path())!, "utf8"),
  );
  expect(data.account).toMatchObject({ email, phone: "0712 345 678" });
  expect(data.favourites[0].title).toBe(title);
  expect(data.saved_searches[0].search).toBe("/properties?deal=rent");
  expect(data.consent.news_and_offers_by_email).toBe(true);

  // Delete the account: wrong password first.
  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Enter your password to confirm").fill("wrong");
  await dialog.getByRole("button", { name: "Delete account" }).click();
  await expect(dialog.getByText("That password isn't right.")).toBeVisible();
  await dialog.getByLabel("Enter your password to confirm").fill(password);
  await dialog.getByRole("button", { name: "Delete account" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  expect(
    djangoShell(
      `from apps.accounts.models import User; print(User.objects.filter(email="${email}").exists())`,
    )
      .split("\n")
      .pop(),
  ).toBe("False");
});
