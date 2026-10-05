import { z } from "zod";

import type { components } from "@/lib/api/schema";

type ApiProperty = components["schemas"]["DashboardProperty"];
export type ListingPayload = components["schemas"]["DashboardPropertyRequest"];

export const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "under_offer", label: "Under offer" },
  { value: "sold", label: "Sold" },
  { value: "let", label: "Let" },
  { value: "archived", label: "Archived" },
] as const;

export const DEAL_TYPES = [
  { value: "sale", label: "For sale" },
  { value: "rent", label: "For rent" },
  { value: "lease", label: "Commercial lease" },
] as const;

export const PRICE_UNITS = [
  { value: "total", label: "Total price" },
  { value: "per_month", label: "per month" },
  { value: "per_sqm", label: "per m²" },
  { value: "per_sqft", label: "per ft²" },
  { value: "per_acre", label: "per acre" },
] as const;

export const FURNISHING = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi", label: "Semi-furnished" },
  { value: "furnished", label: "Furnished" },
] as const;

export const LAND_UNITS = [
  { value: "acres", label: "acres" },
  { value: "hectares", label: "hectares" },
  { value: "sqm", label: "m²" },
] as const;

const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

const wholeNumber = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d+$/.test(v), "Use a whole number (no commas)");
const decimal = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^\d+(\.\d+)?$/.test(v),
    "Use a number, e.g. 120.5",
  );
const coordinate = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^-?\d+(\.\d+)?$/.test(v),
    "Use a decimal number, e.g. -1.2921",
  );

export const listingSchema = z
  .object({
    title: z.string().trim().min(5, "At least 5 characters").max(150),
    description: z
      .string()
      .trim()
      .min(20, "Add a short description (20+ characters)"),
    deal_type: z.enum(values(DEAL_TYPES)),
    property_type: z.string().min(1, "Choose a property type"),
    status: z.enum(values(STATUSES)),
    price: wholeNumber,
    price_unit: z.enum(values(PRICE_UNITS)),
    price_on_request: z.boolean(),
    bedrooms: wholeNumber,
    bathrooms: wholeNumber,
    parking_spaces: wholeNumber,
    built_area_sqm: decimal,
    land_area: decimal,
    land_area_unit: z.enum(values(LAND_UNITS)),
    furnishing: z.union([z.enum(values(FURNISHING)), z.literal("")]),
    amenities: z.array(z.string()),
    county: z.string().min(1, "Choose a county"),
    area: z.string(),
    /** Typed when the area isn't in the list; added under the county on save. */
    new_area: z.string().trim().max(100, "Keep it under 100 characters"),
    neighbourhood: z.string(),
    lat: coordinate,
    lng: coordinate,
    show_exact_location: z.boolean(),
    agent: z.string(),
    project: z.string(),
    video_url: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || /^https?:\/\//.test(v),
        "Paste the full link (https://…)",
      ),
    is_featured: z.boolean(),
    seo_title: z.string().trim().max(70, "Keep it under 70 characters"),
    seo_description: z.string().trim().max(160, "Keep it under 160 characters"),
  })
  .superRefine((v, ctx) => {
    if (v.county && !v.area && !v.new_area) {
      ctx.addIssue({
        code: "custom",
        path: ["area"],
        message: "Choose an area, or type it if it isn't listed",
      });
    }
    if (!v.price_on_request && v.price === "") {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "Enter a price, or tick 'Price on request'",
      });
    }
    if ((v.lat === "") !== (v.lng === "")) {
      ctx.addIssue({
        code: "custom",
        path: ["lat"],
        message: "Enter both latitude and longitude, or neither",
      });
    }
  });

export type ListingFormValues = z.infer<typeof listingSchema>;

export const emptyListing: ListingFormValues = {
  title: "",
  description: "",
  deal_type: "sale",
  property_type: "",
  status: "draft",
  price: "",
  price_unit: "total",
  price_on_request: false,
  bedrooms: "",
  bathrooms: "",
  parking_spaces: "",
  built_area_sqm: "",
  land_area: "",
  land_area_unit: "acres",
  furnishing: "",
  amenities: [],
  county: "",
  area: "",
  new_area: "",
  neighbourhood: "",
  lat: "",
  lng: "",
  show_exact_location: false,
  agent: "",
  project: "",
  video_url: "",
  is_featured: false,
  seo_title: "",
  seo_description: "",
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const int = (v: string) => (v === "" ? null : Number(v));
const dec = (v: string) => (v === "" ? null : v);

export function fromApi(p: ApiProperty): ListingFormValues {
  return {
    title: p.title,
    description: p.description,
    deal_type: p.deal_type,
    property_type: p.property_type,
    status: p.status ?? "draft",
    price: str(p.price),
    price_unit: p.price_unit ?? "total",
    price_on_request: p.price_on_request ?? false,
    bedrooms: str(p.bedrooms),
    bathrooms: str(p.bathrooms),
    parking_spaces: str(p.parking_spaces),
    built_area_sqm: str(p.built_area_sqm),
    land_area: str(p.land_area),
    land_area_unit: p.land_area_unit ?? "acres",
    furnishing: (p.furnishing ?? "") as ListingFormValues["furnishing"],
    amenities: p.amenities ?? [],
    county: str(p.county),
    area: str(p.area),
    new_area: "",
    neighbourhood: str(p.neighbourhood),
    lat: str(p.lat),
    lng: str(p.lng),
    show_exact_location: p.show_exact_location ?? false,
    agent: str(p.agent),
    project: str(p.project),
    video_url: p.video_url ?? "",
    is_featured: p.is_featured ?? false,
    seo_title: p.seo_title ?? "",
    seo_description: p.seo_description ?? "",
  };
}

export function toPayload(v: ListingFormValues): ListingPayload {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    deal_type: v.deal_type,
    property_type: v.property_type,
    status: v.status,
    price: v.price_on_request && v.price === "" ? null : int(v.price),
    price_unit: v.price_unit,
    price_on_request: v.price_on_request,
    bedrooms: int(v.bedrooms),
    bathrooms: int(v.bathrooms),
    parking_spaces: int(v.parking_spaces),
    built_area_sqm: dec(v.built_area_sqm),
    land_area: dec(v.land_area),
    land_area_unit: v.land_area_unit,
    furnishing: v.furnishing,
    amenities: v.amenities,
    ...(v.new_area
      ? {
          new_area: v.new_area,
          new_area_county: Number(v.county),
          neighbourhood: null,
        }
      : {
          area: Number(v.area),
          neighbourhood: v.neighbourhood ? Number(v.neighbourhood) : null,
        }),
    lat: v.lat === "" ? null : Number(v.lat),
    lng: v.lng === "" ? null : Number(v.lng),
    show_exact_location: v.show_exact_location,
    agent: v.agent ? Number(v.agent) : null,
    project: v.project ? Number(v.project) : null,
    video_url: v.video_url.trim(),
    is_featured: v.is_featured,
    seo_title: v.seo_title.trim(),
    seo_description: v.seo_description.trim(),
  };
}

/** Field names as the form labels them, in form order (for "Please check: …"). */
export const FIELD_LABELS: Partial<Record<keyof ListingFormValues, string>> = {
  title: "Title",
  deal_type: "Deal",
  property_type: "Property type",
  description: "Description",
  price: "Price",
  price_unit: "Price is",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  parking_spaces: "Parking",
  built_area_sqm: "Built area",
  land_area: "Land size",
  land_area_unit: "Land size unit",
  furnishing: "Furnishing",
  amenities: "Amenities",
  county: "County",
  area: "Area",
  new_area: "Area",
  neighbourhood: "Neighbourhood",
  lat: "Latitude",
  lng: "Longitude",
  agent: "Staff contact",
  project: "Development project",
  video_url: "Video link",
  status: "Status",
  seo_title: "SEO title",
  seo_description: "SEO description",
};

/** The invalid fields among `names`, in form order, with their labels. */
export function invalidFields(names: string[]) {
  return (Object.keys(FIELD_LABELS) as (keyof ListingFormValues)[])
    .filter((n) => names.includes(n))
    .map((name) => ({ name, label: FIELD_LABELS[name]! }));
}
