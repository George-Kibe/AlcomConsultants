/**
 * JSON for a <script type="application/ld+json"> tag. `<` is escaped so text such as
 * "</script>" inside a title can never close the tag early.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
