const UNIT_SUFFIX: Record<string, string> = {
  total: "",
  per_month: " / month",
  per_sqm: " / m²",
  per_sqft: " / ft²",
  per_acre: " / acre",
};

/** "KES 180,000 / month", or "Price on request". */
export function formatListingPrice(
  price: number | null | undefined,
  unit = "total",
  onRequest = false,
): string {
  if (onRequest || price === null || price === undefined)
    return "Price on request";
  return `KES ${new Intl.NumberFormat("en-KE").format(price)}${UNIT_SUFFIX[unit] ?? ""}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}
