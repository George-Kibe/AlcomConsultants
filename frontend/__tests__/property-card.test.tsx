import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { PropertyCard } from "@/components/site/property-card";
import type { PropertyListItem } from "@/lib/listings";

const item = {
  reference: "ALC-R-1002",
  slug: "3-bed-apartment-alc-r-1002",
  title: "3 Bedroom Apartment",
  deal_type: "rent",
  status: "under_offer",
  price: 180000,
  price_unit: "per_month",
  price_on_request: false,
  bedrooms: 3,
  bathrooms: 2,
  built_area_sqm: "165.00",
  location: { neighbourhood: "", area: "Kilimani", county: "Nairobi" },
  cover_image: { public_id: "alcom_images/site/x", alt_text: "Front" },
} as unknown as PropertyListItem;

test("property card shows the essentials and links to the listing", () => {
  render(<PropertyCard property={item} />);
  expect(
    screen.getByRole("link", { name: "3 Bedroom Apartment" }),
  ).toHaveAttribute("href", "/properties/3-bed-apartment-alc-r-1002");
  expect(screen.getByText("Kilimani, Nairobi")).toBeInTheDocument();
  expect(screen.getByText("KES 180,000 / month")).toBeInTheDocument();
  expect(screen.getByText("For Rent")).toBeInTheDocument();
  expect(screen.getByText("Under offer")).toBeInTheDocument();
  expect(screen.getByText("165 m²")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Front" })).toBeInTheDocument();
});

test("studio and missing photo", () => {
  render(
    <PropertyCard
      property={{
        ...item,
        bedrooms: 0,
        cover_image: null,
        status: "published",
      }}
    />,
  );
  expect(screen.getByText("Studio")).toBeInTheDocument();
  expect(screen.getByLabelText("No photo yet")).toBeInTheDocument();
  expect(screen.queryByText("Under offer")).not.toBeInTheDocument();
});
