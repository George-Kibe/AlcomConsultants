import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Alcom Consultants/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Alcom Consultants Limited" }),
  ).toBeVisible();
});
