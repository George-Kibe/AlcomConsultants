/**
 * Full-stack dashboard tests: need the Django API (run against the Docker stack with
 * E2E_FULLSTACK=1 E2E_BASE_URL=http://localhost:8080 and a staff user, see CI).
 */
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import { freshTotp, totp } from "./totp";

const EMAIL = process.env.E2E_STAFF_EMAIL ?? "e2e-staff@alcom.test";
const PASSWORD = process.env.E2E_STAFF_PASSWORD ?? "e2e-Staff-pass-2026";
const AUTH = "/api/v1/auth/browser/v1";

test.describe.configure({ mode: "serial" });

/** Start every test with the staff account signed out and without two-step verification. */
async function resetStaffAccount(request: APIRequestContext) {
  await request.get(`${AUTH}/config`);
  const csrf = (await request.storageState()).cookies.find(
    (c) => c.name === "csrftoken",
  );
  const headers = { "X-CSRFToken": csrf?.value ?? "" };
  const login = await request.post(`${AUTH}/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
    headers,
  });
  expect(
    login.status(),
    "staff account must be able to sign in (not 2FA-locked)",
  ).toBe(200);
  await request.delete(`${AUTH}/account/authenticators/totp`, { headers });
  await request.delete(`${AUTH}/auth/session`, { headers });
}

test.beforeEach(async ({ request }) => {
  await resetStaffAccount(request);
});

async function signIn(page: Page, email = EMAIL, password = PASSWORD) {
  await page.goto("/dashboard/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/dashboard\/login/);
}

test("dashboard pages need a session", async ({ page }) => {
  await page.goto("/dashboard/security");
  await expect(page).toHaveURL(
    /\/dashboard\/login\?next=%2Fdashboard%2Fsecurity/,
  );
  await expect(
    page.getByRole("heading", { name: "Staff sign in" }),
  ).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  // A separate address, so failed attempts never lock the real staff account.
  await signIn(page, "nobody@alcom.test", "not-the-password");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/login/);
});

test("sign in, see the overview, sign out", async ({ page }) => {
  await signIn(page);
  await page.waitForURL((url) => url.pathname === "/dashboard");
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  await expect(page.getByTestId("stat-listed")).toBeVisible();

  await signOut(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard\/login/);
});

test("turn on two-step verification and sign in with a code", async ({
  page,
}) => {
  test.setTimeout(90_000); // waits for a fresh 30-second authenticator code
  await signIn(page);
  await page.waitForURL((url) => url.pathname === "/dashboard");
  await page.goto("/dashboard/security");

  const key = (await page.locator("code").first().textContent())!.trim();
  const activatedAt = Date.now();
  await page.getByLabel("Enter the 6-digit code it shows").fill(totp(key));
  await page.getByRole("button", { name: "Turn on" }).click();
  await expect(page.getByText("Sign-in asks for a code")).toBeVisible();
  await expect(page.locator("ul.font-mono li").first()).toBeVisible(); // recovery codes

  await signOut(page);
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Two-step verification" }),
  ).toBeVisible();
  const code = await freshTotp(key, activatedAt); // a used code is rightly rejected
  await page.getByLabel("Verification code").pressSequentially(code); // submits on 6 digits
  await page.waitForURL((url) => url.pathname === "/dashboard");

  // Turn it off from the UI (may ask to confirm the password first).
  await page.goto("/dashboard/security");
  await page
    .getByRole("button", { name: "Turn off two-step verification" })
    .click();
  const confirm = page.getByLabel("Confirm your password to continue");
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.fill(PASSWORD);
    await page.getByRole("button", { name: "Confirm" }).click();
  }
  await expect(
    page.getByText("Two-step verification turned off"),
  ).toBeVisible();
});

test("dashboard screens have no accessibility violations", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const check = async (label: string) => {
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => localStorage.setItem("theme", t), theme);
      await page.reload();
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const summary = results.violations.flatMap((v) =>
        v.nodes.map(
          (n) =>
            `${label} ${v.id} [${theme}] ${n.target.join(" ")}: ${n.failureSummary}`,
        ),
      );
      expect(summary).toEqual([]);
    }
  };

  await page.goto("/dashboard/login");
  await check("login");
  await signIn(page);
  await page.waitForURL((url) => url.pathname === "/dashboard");
  await expect(page.getByTestId("stat-listed")).toBeVisible();
  await check("overview");
  await page.goto("/dashboard/security");
  await expect(page.locator("code").first()).toBeVisible();
  await check("security");
});
