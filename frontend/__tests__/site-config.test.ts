import { describe, expect, test } from "vitest";

import { isActive } from "@/components/site/nav-links";
import { formatPrice } from "@/lib/properties";
import { services, siteConfig, telLink, whatsappLink } from "@/lib/site-config";

describe("whatsappLink", () => {
  test("links to the business number", () => {
    expect(whatsappLink()).toBe(`https://wa.me/${siteConfig.contact.whatsapp}`);
  });

  test("encodes a prefilled message", () => {
    expect(whatsappLink("Hi & hello")).toBe(
      `https://wa.me/${siteConfig.contact.whatsapp}?text=Hi%20%26%20hello`,
    );
  });
});

test("telLink strips formatting", () => {
  expect(telLink("+254 712 345-678")).toBe("tel:+254712345678");
});

describe("isActive", () => {
  test("home only matches exactly", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/services", "/")).toBe(false);
  });

  test("sections match their sub-pages", () => {
    expect(isActive("/services/property-agency", "/services")).toBe(true);
    expect(isActive("/about", "/services")).toBe(false);
  });
});

test("every service has a unique slug", () => {
  const slugs = services.map((s) => s.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
});

describe("formatPrice", () => {
  test("sale prices show the full amount", () => {
    expect(formatPrice(85000000, "sale")).toBe("KES 85,000,000");
  });

  test("rent prices are per month", () => {
    expect(formatPrice(180000, "rent")).toBe("KES 180,000 / month");
  });
});
