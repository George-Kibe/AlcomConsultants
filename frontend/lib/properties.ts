/** Listing summary shown on cards. Mirrors the listings API response planned for Phase 2. */
export type DealType = "sale" | "rent";

export type PropertySummary = {
  slug: string;
  title: string;
  location: string;
  summary: string;
  dealType: DealType;
  /** Price in KES. For rentals this is per month. */
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  /** Built-up area in square metres. */
  areaSqm?: number;
  image: { src: string; alt: string; blurDataURL?: string };
};

export const dealTypeLabel: Record<DealType, string> = {
  sale: "For Sale",
  rent: "For Rent",
};

export function formatPrice(price: number, dealType: DealType) {
  const amount = `KES ${new Intl.NumberFormat("en-KE").format(price)}`;
  return dealType === "rent" ? `${amount} / month` : amount;
}
