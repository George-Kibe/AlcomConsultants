import type { components } from "@/lib/api/schema";

export type PropertyListItem = components["schemas"]["PropertyList"];
export type PropertyDetail = components["schemas"]["PropertyDetail"];
export type MapPoint = components["schemas"]["MapPoint"];

/** Query-string keys the search page understands (everything else is ignored). */
export const SEARCH_KEYS = [
  "deal",
  "type",
  "county",
  "area",
  "neighbourhood",
  "where",
  "q",
  "min_price",
  "max_price",
  "min_beds",
  "min_baths",
  "furnishing",
  "amenities",
  "sort",
  "page",
  "view",
  "bbox",
] as const;
export type SearchKey = (typeof SEARCH_KEYS)[number];
export type SearchState = Partial<Record<SearchKey, string>>;

/** Keys that are sent to the API (display-only keys like `where`/`view` are dropped). */
const API_KEYS: SearchKey[] = SEARCH_KEYS.filter(
  (k) => k !== "where" && k !== "view",
);

export function readSearch(
  params: Record<string, string | string[] | undefined>,
): SearchState {
  const state: SearchState = {};
  for (const key of SEARCH_KEYS) {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) state[key] = first;
  }
  return state;
}

export function apiQuery(state: SearchState): Record<string, string> {
  return Object.fromEntries(
    API_KEYS.filter((k) => state[k]).map((k) => [k, state[k] as string]),
  );
}

/** `/properties?…` with some keys replaced (undefined/"" removes a key). */
export function searchHref(
  state: SearchState,
  changes: SearchState = {},
): string {
  const next = { ...state, ...changes };
  const qs = new URLSearchParams(
    Object.entries(next).filter(([, v]) => v !== undefined && v !== "") as [
      string,
      string,
    ][],
  ).toString();
  return qs ? `/properties?${qs}` : "/properties";
}

const DEAL_PHRASE: Record<string, string> = {
  sale: "for sale",
  rent: "for rent",
  lease: "for lease",
};

/** e.g. "Apartments for rent in Kilimani" */
export function searchHeading(state: SearchState, typeName?: string): string {
  const what = typeName ? pluralise(typeName) : "Properties";
  const deal = state.deal
    ? ` ${DEAL_PHRASE[state.deal] ?? ""}`
    : " for sale and rent";
  const where = state.where ? ` in ${state.where.split(",")[0]}` : " in Kenya";
  return `${what}${deal}${where}`;
}

function pluralise(name: string): string {
  if (/land$/i.test(name) || /space$/i.test(name) || name.includes("/"))
    return name;
  return /s$/i.test(name) ? name : `${name}s`;
}

/** Split a plain-text description into paragraphs (blank line = new paragraph). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** YouTube / Vimeo link → privacy-friendly embed URL, or null if unsupported. */
export function videoEmbed(
  url: string | null | undefined,
): { provider: string; src: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com") {
      id =
        u.searchParams.get("v") ??
        u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ??
        null;
    }
    if (id && /^[\w-]{6,}$/.test(id)) {
      return {
        provider: "YouTube",
        src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
      };
    }
    if (host === "vimeo.com") {
      const vid = u.pathname.match(/^\/(\d+)/)?.[1];
      if (vid)
        return {
          provider: "Vimeo",
          src: `https://player.vimeo.com/video/${vid}?autoplay=1&dnt=1`,
        };
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export function locationLabel(p: Pick<PropertyListItem, "location">): string {
  const { neighbourhood, area, county } = p.location;
  return [neighbourhood, area, county].filter(Boolean).join(", ");
}

/** schema.org structured data for a listing (Google rich results). */
export function listingJsonLd(
  p: PropertyDetail,
  url: string,
  images: string[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    url,
    description: p.seo_description || p.description.slice(0, 300),
    datePosted: p.published_at,
    image: images,
    ...(p.price && !p.price_on_request
      ? {
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "KES",
            businessFunction:
              p.deal_type === "sale"
                ? "http://purl.org/goodrelations/v1#Sell"
                : "http://purl.org/goodrelations/v1#LeaseOut",
            availability:
              p.status === "sold" || p.status === "let"
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
          },
        }
      : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: p.location.area,
      addressRegion: p.location.county,
      addressCountry: "KE",
    },
  };
}
