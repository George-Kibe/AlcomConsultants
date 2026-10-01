import Link from "next/link";

/** Page links for server-rendered lists; `href` builds the URL of page n. */
export function Pagination({
  page: requested,
  total,
  pageSize,
  href: link,
}: {
  page: number;
  total: number;
  pageSize: number;
  href: (page: number) => string;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const page = Math.min(Math.max(1, requested || 1), pages);
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
