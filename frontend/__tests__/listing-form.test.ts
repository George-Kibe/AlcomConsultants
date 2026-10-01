import { describe, expect, test } from "vitest";

import { formatListingPrice } from "@/lib/format";
import {
  emptyListing,
  fromApi,
  listingSchema,
  toPayload,
} from "@/lib/listing-form";

const valid = {
  ...emptyListing,
  title: "3 Bedroom Apartment",
  description: "A bright, spacious apartment close to amenities.",
  property_type: "apartment",
  price: "15000000",
  county: "47",
  area: "12",
};

describe("listingSchema", () => {
  test("accepts a complete listing", () => {
    expect(listingSchema.safeParse(valid).success).toBe(true);
  });

  test.each([
    [{ title: "Flat" }, "title"],
    [{ description: "Too short" }, "description"],
    [{ property_type: "" }, "property_type"],
    [{ price: "" }, "price"],
    [{ price: "15,000,000" }, "price"],
    [{ area: "" }, "area"],
    [{ lat: "-1.29" }, "lat"],
    [{ lat: "abc", lng: "36.8" }, "lat"],
    [{ video_url: "youtube.com/x" }, "video_url"],
    [{ seo_description: "x".repeat(161) }, "seo_description"],
  ])("rejects %o", (change, field) => {
    const result = listingSchema.safeParse({ ...valid, ...change });
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((i) => i.path[0])).toContain(field);
  });

  test("price may be empty when on request", () => {
    expect(
      listingSchema.safeParse({ ...valid, price: "", price_on_request: true })
        .success,
    ).toBe(true);
  });
});

describe("toPayload / fromApi", () => {
  test("converts form strings to API types", () => {
    const payload = toPayload({
      ...valid,
      bedrooms: "3",
      built_area_sqm: "120.5",
      neighbourhood: "",
      lat: "-1.2921",
      lng: "36.8219",
      agent: "5",
      title: "  Spaced title  ",
    });
    expect(payload).toMatchObject({
      title: "Spaced title",
      price: 15000000,
      bedrooms: 3,
      bathrooms: null,
      built_area_sqm: "120.5",
      area: 12,
      neighbourhood: null,
      lat: -1.2921,
      lng: 36.8219,
      agent: 5,
      project: null,
    });
  });

  test("round-trips through the API shape", () => {
    const payload = toPayload({ ...valid, bedrooms: "2", amenities: ["gym"] });
    const api = {
      ...payload,
      uuid: "u",
      reference: "ALC-S-1001",
      slug: "s",
      county: 47,
      price: payload.price ?? null,
      status: "draft",
    } as unknown as Parameters<typeof fromApi>[0];
    const back = fromApi(api);
    expect(back).toMatchObject({
      bedrooms: "2",
      price: "15000000",
      county: "47",
      area: "12",
    });
    expect(back.amenities).toEqual(["gym"]);
  });
});

test("formatListingPrice", () => {
  expect(formatListingPrice(15000000)).toBe("KES 15,000,000");
  expect(formatListingPrice(180000, "per_month")).toBe("KES 180,000 / month");
  expect(formatListingPrice(5000000, "per_acre")).toBe("KES 5,000,000 / acre");
  expect(formatListingPrice(null)).toBe("Price on request");
  expect(formatListingPrice(1000, "total", true)).toBe("Price on request");
});
