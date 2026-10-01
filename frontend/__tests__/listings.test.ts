import { describe, expect, test } from "vitest";

import {
  apiQuery,
  listingJsonLd,
  paragraphs,
  readSearch,
  searchHeading,
  searchHref,
  videoEmbed,
  type PropertyDetail,
} from "@/lib/listings";

describe("search state", () => {
  test("reads only known keys, first value wins", () => {
    expect(
      readSearch({ deal: "rent", page: ["2", "3"], evil: "x", q: "" }),
    ).toEqual({
      deal: "rent",
      page: "2",
    });
  });

  test("apiQuery drops display-only keys", () => {
    expect(
      apiQuery({
        deal: "sale",
        where: "Kilimani, Nairobi",
        view: "map",
        area: "kilimani",
      }),
    ).toEqual({ deal: "sale", area: "kilimani" });
  });

  test("searchHref merges and removes keys", () => {
    expect(
      searchHref(
        { deal: "rent", page: "3" },
        { page: undefined, min_beds: "2" },
      ),
    ).toBe("/properties?deal=rent&min_beds=2");
    expect(searchHref({}, {})).toBe("/properties");
  });

  test.each([
    [{}, undefined, "Properties for sale and rent in Kenya"],
    [
      { deal: "rent", where: "Kilimani, Nairobi" },
      "Apartment",
      "Apartments for rent in Kilimani",
    ],
    [
      { deal: "sale" },
      "Residential Land",
      "Residential Land for sale in Kenya",
    ],
    [{ deal: "lease" }, "Shop / Retail", "Shop / Retail for lease in Kenya"],
  ])("heading for %o", (state, type, expected) => {
    expect(searchHeading(state, type)).toBe(expected);
  });
});

test("paragraphs splits on blank lines", () => {
  expect(paragraphs("First line\nsame paragraph\n\n  Second  \n\n\n")).toEqual([
    "First line\nsame paragraph",
    "Second",
  ]);
});

describe("videoEmbed", () => {
  test.each([
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
    ],
    [
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
    ],
    [
      "https://m.youtube.com/shorts/abcdef123",
      "https://www.youtube-nocookie.com/embed/abcdef123?autoplay=1&rel=0",
    ],
    [
      "https://vimeo.com/123456789",
      "https://player.vimeo.com/video/123456789?autoplay=1&dnt=1",
    ],
  ])("%s", (url, src) => {
    expect(videoEmbed(url)?.src).toBe(src);
  });

  test.each([
    null,
    "",
    "not a url",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=<script>",
  ])("rejects %s", (url) => {
    expect(videoEmbed(url)).toBeNull();
  });
});

test("listingJsonLd", () => {
  const p = {
    title: "Villa",
    description: "Lovely",
    seo_description: "",
    published_at: "2026-10-01T10:00:00Z",
    price: 85000000,
    price_on_request: false,
    deal_type: "sale",
    status: "published",
    location: { area: "Karen", county: "Nairobi" },
  } as unknown as PropertyDetail;
  const ld = listingJsonLd(p, "https://alcom.test/properties/villa", [
    "https://img/1.jpg",
  ]);
  expect(ld).toMatchObject({
    "@type": "RealEstateListing",
    url: "https://alcom.test/properties/villa",
    offers: {
      price: 85000000,
      priceCurrency: "KES",
      availability: "https://schema.org/InStock",
    },
    address: {
      addressLocality: "Karen",
      addressRegion: "Nairobi",
      addressCountry: "KE",
    },
  });
  const sold = listingJsonLd({ ...p, status: "sold" }, "u", []);
  expect(sold.offers?.availability).toBe("https://schema.org/SoldOut");
  expect(
    listingJsonLd({ ...p, price_on_request: true }, "u", []),
  ).not.toHaveProperty("offers");
});
