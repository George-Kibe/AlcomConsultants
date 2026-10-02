import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Dashboard, listings and blog specs need the Django API; run them against the full stack (E2E_FULLSTACK=1).
  testIgnore: process.env.E2E_FULLSTACK
    ? []
    : [
        "**/dashboard*.spec.ts",
        "**/public-listings.spec.ts",
        "**/blog.spec.ts",
        "**/visitor-account.spec.ts",
        "**/enquiries.spec.ts",
        "**/site-content.spec.ts",
      ],
  fullyParallel: true,
  // Full-stack runs share one staff account, so run them one at a time.
  workers: process.env.E2E_FULLSTACK ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // Run against a production build unless an external URL (e.g. the Docker stack) is given.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start:standalone",
        env: { PORT: String(PORT), HOSTNAME: "127.0.0.1" },
        url: `${baseURL}/healthz`,
        reuseExistingServer: !process.env.CI,
      },
});
