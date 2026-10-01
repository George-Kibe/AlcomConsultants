import Link from "next/link";

import { searchHref, type SearchState } from "@/lib/listings";

export function Pagination({
  state,
  total,
  pageSize = 20,
}: {
  state: SearchState;
  total: number;
  pageSize?: number;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const page = Math.min(Math.max(1, Number(state.page ?? 1)), pages);
  const link = (n: number) =>
    searchHref(state, { page: n === 1 ? undefined : String(n) });
  const window = [...new Set([1, page - 1, page, page + 1, pages])].filter(
    (n) => n >= 1 && n <= pages,
  );

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-center gap-1"
    >
      {page > 1 && (
        <Link
          href={link(page - 1)}
          rel="prev"
          className="hover:bg-muted rounded-lg px-3 py-2 text-sm font-medium"
        >
          Previous
        </Link>
      )}
      {window.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - window[i - 1] > 1 && (
            <span className="text-muted-foreground px-1">…</span>
          )}
          <Link
            href={link(n)}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
            className="aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground hover:bg-muted flex size-10 items-center justify-center rounded-lg text-sm font-medium"
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link
          href={link(page + 1)}
          rel="next"
          className="hover:bg-muted rounded-lg px-3 py-2 text-sm font-medium"
        >
          Next
        </Link>
      )}
    </nav>
  );
}
