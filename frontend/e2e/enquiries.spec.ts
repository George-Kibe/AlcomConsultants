/**
 * Full-stack: visitors send enquiries from a property page, a service page and the
 * contact page; staff work the lead in the dashboard (E2E_FULLSTACK=1, demo listings).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./helpers";

const VILLA = "4 Bedroom Villa with Pool";

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

/** The server refuses forms sent within 3 seconds of being shown (bots are fast). */
async function likeAPerson(page: Page) {
  await page.waitForTimeout(3_100);
}

test("property enquiry, worked as a lead in the dashboard", async ({
  page,
  browser,
  isMobile,
}) => {
  test.skip(isMobile, "Enquiry flow runs once, on desktop");
  const name = `Peter Kamau ${Date.now()}`;

  await page.goto("/properties?q=villa");
  await page.getByRole("link", { name: VILLA }).click();
  const form = page.locator("#enquire");
  await expect(
    form.getByRole("heading", { name: "Send an enquiry" }),
  ).toBeVisible();
  await expect(form.getByLabel("Your name")).toBeVisible(); // form loaded
  expect(await axe(page)).toEqual([]);

  await form.getByLabel("Your name").fill(name);
  await form.getByLabel("Email").fill("peter@example.com");
  await form.getByLabel("Phone (optional)").fill("0712 345 678");
  // Consent is required.
  await form.getByRole("button", { name: "Send enquiry" }).click();
  await expect(
    form.getByText("Please agree so we can reply to you."),
  ).toBeVisible();
  await form.getByRole("checkbox").click();
  await likeAPerson(page);
  await form.getByRole("button", { name: "Send enquiry" }).click();
  const thanks = form.getByRole("status");
  await expect(thanks).toContainText("we've received your enquiry");
  const reference = (await thanks.locator("strong").textContent())!.trim();
  expect(reference).toMatch(/^E-\d+$/);

  // Staff: the overview counts it, the list shows it, and the lead gets worked.
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  await signIn(staff, "/dashboard");
  await expect(staff.getByTestId("lead-new")).not.toHaveText("0");
  await staff.getByRole("link", { name: /New enquiries/ }).click();
  await staff.getByLabel("Search enquiries").fill(reference);
  await expect(staff).toHaveURL(new RegExp(`q=${reference}`)); // search applied
  await staff.getByRole("link", { name: new RegExp(name) }).click();
  await expect(staff.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(staff.getByText(VILLA).first()).toBeVisible();
  await expect(
    staff.getByText(
      "Please send me more details. I'd like to arrange a viewing.",
    ),
  ).toBeVisible();
  expect(await axe(staff)).toEqual([]);

  await staff.getByLabel("Stage").click();
  await staff.getByRole("option", { name: "Contacted" }).click();
  await expect(
    staff.getByText("Stage changed from New to Contacted."),
  ).toBeVisible();
  await staff.getByLabel("Assigned to").click();
  await staff.getByRole("option").nth(1).click(); // first staff member after "Nobody yet"
  await expect(staff.getByText(/Assigned to \S/).first()).toBeVisible();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Nairobi",
  });
  await staff.getByLabel("Follow up on").fill(today);
  await expect(staff.getByText(/Follow-up set for/)).toBeVisible();
  await staff
    .getByLabel("Add a note")
    .fill("Called Peter, viewing on Saturday.");
  await staff.getByRole("button", { name: "Add note" }).click();
  await expect(
    staff.getByText("Called Peter, viewing on Saturday."),
  ).toBeVisible();

  // It now shows under follow-ups due and "assigned to me".
  await staff.goto("/dashboard/enquiries?view=due");
  await expect(
    staff.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();
  await staff.goto("/dashboard/enquiries?view=mine");
  await expect(
    staff.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();

  // Clean up: delete it straight from the list.
  await staff
    .getByRole("button", { name: new RegExp(`^Delete E-\\d+ from ${name}$`) })
    .click();
  await staff
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(staff.getByText("Enquiry deleted")).toBeVisible();
  await expect(staff.getByRole("link", { name: new RegExp(name) })).toHaveCount(
    0,
  );
  await staffContext.close();
});

test("valuation and contact forms", async ({ page, isMobile }) => {
  test.skip(isMobile, "Runs once, on desktop");
  const name = `Faith Wambui ${Date.now()}`;

  await page.goto("/services/property-valuations");
  await page.getByRole("link", { name: "Request a valuation" }).click();
  const form = page.locator("#enquire");
  await expect(form.getByLabel("Your name")).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await form.getByLabel("Your name").fill(name);
  await form.getByLabel("Email").fill("faith@example.com");
  // Location is required for valuations.
  await form.getByRole("checkbox").click();
  await likeAPerson(page);
  await form.getByRole("button", { name: "Send enquiry" }).click();
  await expect(form.getByText("Tell us where the property is.")).toBeVisible();
  await form.getByLabel("Type of property").click();
  await page.getByRole("option", { name: "Land" }).click();
  await form.getByLabel("Where is it?").fill("Kitengela, Kajiado");
  await form.getByLabel("What is the valuation for?").click();
  await page.getByRole("option", { name: "Mortgage or bank loan" }).click();
  await form.getByRole("button", { name: "Send enquiry" }).click();
  await expect(form.getByRole("status")).toContainText(/E-\d+/);

  await page.goto("/contact");
  const contact = page.locator("#message");
  await expect(contact.getByLabel("How can we help?")).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await contact.getByLabel("Your name").fill(name);
  await contact.getByLabel("Email").fill("faith@example.com");
  await contact
    .getByLabel("How can we help?")
    .fill("I'd like to let my apartment in Kilimani.");
  await contact.getByRole("checkbox").click();
  await likeAPerson(page);
  await contact.getByRole("button", { name: "Send message" }).click();
  await expect(contact.getByRole("status")).toContainText(/E-\d+/);
});
