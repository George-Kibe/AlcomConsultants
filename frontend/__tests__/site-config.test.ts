import { describe, expect, test } from "vitest";

import { isActive } from "@/components/site/nav-links";
import { services, siteConfig, telLink, whatsappLink } from "@/lib/site-config";

describe("whatsappLink", () => {
  test("every WhatsApp chat goes to +254 181 943550", () => {
    expect(siteConfig.contact.whatsapp).toBe("254181943550");
  });

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
