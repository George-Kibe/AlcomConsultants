import { jsonLd } from "@/lib/json-ld";

/** Structured data for search engines (schema.org), as a JSON-LD script tag. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}
