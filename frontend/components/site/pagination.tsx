import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

const step = "flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium";

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
      {page > 1 ? (
        <Link
          href={link(page - 1)}
          rel="prev"
          className={`${step} hover:bg-muted`}
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
          Previous
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${step} text-muted-foreground/60`}
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
          Previous
        </span>
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
      {page < pages ? (
        <Link
          href={link(page + 1)}
          rel="next"
          className={`${step} hover:bg-muted`}
        >
          Next
          <ChevronRightIcon className="size-4" aria-hidden />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${step} text-muted-foreground/60`}
        >
          Next
          <ChevronRightIcon className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
