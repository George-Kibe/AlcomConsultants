"use client";

import { ImageOffIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CloudImage } from "@/components/cloud-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardProperties, useOverview } from "@/lib/api/hooks";
import { formatDate, formatListingPrice } from "@/lib/format";

import { StatusBadge } from "./status-badge";

const TABS = [
  { value: "", label: "All", count: "total" },
  { value: "published", label: "Live", count: "listed" },
  { value: "draft", label: "Drafts", count: "drafts" },
  { value: "under_offer", label: "Under offer", count: "under_offer" },
  { value: "closed", label: "Sold / let", count: "closed" },
  { value: "archived", label: "Archived", count: "archived" },
] as const;

const SORTS = [
  { value: "-updated", label: "Recently updated" },
  { value: "-created", label: "Newest first" },
  { value: "-price", label: "Price: high to low" },
  { value: "price", label: "Price: low to high" },
  { value: "title", label: "Title A–Z" },
];

function Thumb({ publicId, alt }: { publicId: string | null; alt: string }) {
  return publicId ? (
    <CloudImage
      src={publicId}
      alt={alt}
      width={96}
      height={72}
      crop="fill"
      className="h-14 w-20 shrink-0 rounded-lg object-cover"
    />
  ) : (
    <span className="bg-muted text-muted-foreground flex h-14 w-20 shrink-0 items-center justify-center rounded-lg">
      <ImageOffIcon className="size-5" aria-label="No photos yet" />
    </span>
  );
}

export function PropertyList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const page = Number(params.get("page") ?? "1");
  const sort = params.get("sort") ?? "-updated";
  const [q, setQ] = useState(params.get("q") ?? "");

  const overview = useOverview();
  const list = useDashboardProperties({
    status,
    q: params.get("q") ?? "",
    page,
    sort,
  });

  function update(next: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "" || (k === "page" && v === 1))
        sp.delete(k);
      else sp.set(k, String(v));
    }
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (params.get("q") ?? "")) update({ q, page: 1 });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const rows = list.data?.results ?? [];
  const total = list.data?.count ?? 0;
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Properties</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit and publish listings.
          </p>
        </div>
        <Button asChild size="xl">
          <Link href="/dashboard/properties/new">
            <PlusIcon data-icon="inline-start" />
            Add property
          </Link>
        </Button>
      </div>

      <nav aria-label="Filter by status" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-1 border-b">
          {TABS.map((tab) => {
            const active = status === tab.value;
            const count = overview.data?.[tab.count];
            return (
              <li key={tab.value}>
                <button
                  type="button"
                  onClick={() => update({ status: tab.value, page: 1 })}
                  aria-current={active ? "page" : undefined}
                  className="text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground -mb-px flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap"
                >
                  {tab.label}
                  {count !== undefined && (
                    <span className="bg-muted rounded-full px-2 text-xs">
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Label htmlFor="property-search" className="sr-only">
            Search properties
          </Label>
          <SearchIcon
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="property-search"
            type="search"
            placeholder="Search by reference, title or area"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <Select
          value={sort}
          onValueChange={(v) => update({ sort: v === "-updated" ? "" : v })}
        >
          <SelectTrigger className="h-11 sm:w-56" aria-label="Sort properties">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : list.isError ? (
        <p className="text-destructive">
          Couldn&apos;t load properties. Please try again.
        </p>
      ) : rows.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-10 text-center">
          <p className="font-medium">
            {params.get("q") || status
              ? "No properties match."
              : "No properties yet."}
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard/properties/new">
              Add your first property
            </Link>
          </Button>
        </div>
      ) : (
        <ul
          className="bg-card divide-y rounded-2xl border"
          aria-label="Properties"
        >
          {rows.map((p) => (
            <li key={p.uuid}>
              <Link
                href={`/dashboard/properties/${p.uuid}`}
                className="hover:bg-muted/60 flex items-center gap-4 p-3 sm:p-4"
              >
                <Thumb publicId={p.cover_image} alt="" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{p.title}</span>
                    <StatusBadge status={p.status ?? "draft"} />
                    {p.is_featured && (
                      <span className="text-success text-xs font-medium">
                        ★ Featured
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-sm">
                    {p.reference} · {p.property_type} · {p.location}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold sm:hidden">
                    {formatListingPrice(
                      p.price,
                      p.price_unit,
                      p.price_on_request,
                    )}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-semibold">
                    {formatListingPrice(
                      p.price,
                      p.price_unit,
                      p.price_on_request,
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {p.photo_count} photos · Updated {formatDate(p.updated_at)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between"
        >
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => update({ page: page - 1 })}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {pages} · {total} properties
          </span>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => update({ page: page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
