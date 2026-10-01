"use client";

import { ListIcon, MapIcon, SlidersHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { searchHref, type SearchState } from "@/lib/listings";

import { LocationAutocomplete } from "./location-autocomplete";

const ANY = "any";
const DEALS = [
  { value: "", label: "All" },
  { value: "sale", label: "Buy" },
  { value: "rent", label: "Rent" },
  { value: "lease", label: "Commercial" },
];
const SALE_PRICES = [
  2_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000,
];
const RENT_PRICES = [20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const short = (n: number) =>
  n >= 1_000_000 ? `KES ${n / 1_000_000}M` : `KES ${n / 1_000}K`;

type Option = { slug: string; name: string };
type Choice = { value: string; label: string };

export function SearchFilters({
  state,
  types,
  amenities,
  total,
}: {
  state: SearchState;
  types: Option[];
  amenities: (Option & { group?: string })[];
  total: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const prices =
    state.deal === "rent" || state.deal === "lease" ? RENT_PRICES : SALE_PRICES;
  const selectedAmenities = state.amenities?.split(",").filter(Boolean) ?? [];
  const moreCount = [
    state.min_baths,
    state.furnishing,
    ...selectedAmenities,
  ].filter(Boolean).length;
  const allCount =
    moreCount +
    [state.type, state.min_price, state.max_price, state.min_beds].filter(
      Boolean,
    ).length;

  function go(changes: SearchState) {
    startTransition(() =>
      router.push(searchHref(state, { ...changes, page: undefined }), {
        scroll: false,
      }),
    );
  }

  /** A filter dropdown; `fallback` is the value shown (and meant) when the key is unset. */
  function select(
    key: keyof SearchState,
    label: string,
    options: Choice[],
    className = "",
    fallback = ANY,
  ) {
    return (
      <Select
        value={state[key] || fallback}
        onValueChange={(v) =>
          go({ [key]: v === ANY || v === fallback ? undefined : v })
        }
      >
        <SelectTrigger
          className={cn("bg-background w-full", className)}
          aria-label={label}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const typeSelect = select("type", "Property type", [
    { value: ANY, label: "Any type" },
    ...types.map((t) => ({ value: t.slug, label: t.name })),
  ]);
  const minSelect = select("min_price", "Minimum price", [
    { value: ANY, label: "Min price" },
    ...prices.map((p) => ({ value: String(p), label: short(p) })),
  ]);
  const maxSelect = select("max_price", "Maximum price", [
    { value: ANY, label: "Max price" },
    ...prices.map((p) => ({ value: String(p), label: short(p) })),
  ]);
  const bedsSelect = select("min_beds", "Minimum bedrooms", [
    { value: ANY, label: "Any beds" },
    ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+ beds` })),
  ]);

  const field = (label: string, control: React.ReactNode) => (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {control}
    </div>
  );

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <nav aria-label="Deal type" className="flex gap-1">
        {DEALS.map((d) => {
          const active = (state.deal ?? "") === d.value;
          return (
            <button
              key={d.label}
              type="button"
              aria-pressed={active}
              onClick={() =>
                go({
                  deal: d.value || undefined,
                  min_price: undefined,
                  max_price: undefined,
                })
              }
              className={cn(
                "min-h-10 rounded-lg px-4 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {d.label}
            </button>
          );
        })}
      </nav>

      {/* Phones/tablets: location + one Filters button. Desktop: every filter inline. */}
      <div className="grid grid-cols-[1fr_auto] gap-2 lg:grid-cols-[2fr_repeat(4,1fr)_auto]">
        <LocationAutocomplete
          key={`${state.where ?? ""}|${state.q ?? ""}`}
          initial={state.where ?? state.q ?? ""}
          onChoose={(choice) => go(choice)}
          className="min-w-0"
        />
        <div className="hidden lg:contents">
          {typeSelect}
          {minSelect}
          {maxSelect}
          {bedsSelect}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11">
              <SlidersHorizontalIcon data-icon="inline-start" />
              <span className="lg:hidden">
                Filters{allCount ? ` (${allCount})` : ""}
              </span>
              <span className="hidden lg:inline">
                More filters{moreCount ? ` (${moreCount})` : ""}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90%] gap-0 sm:max-w-md">
            <SheetHeader className="border-b">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Narrow down by type, price, rooms and amenities
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              <div className="flex flex-col gap-4 lg:hidden">
                {field("Property type", typeSelect)}
                <div className="grid grid-cols-2 gap-3">
                  {field("Min price", minSelect)}
                  {field("Max price", maxSelect)}
                </div>
                {field("Bedrooms", bedsSelect)}
              </div>
              {field(
                "Bathrooms",
                select("min_baths", "Minimum bathrooms", [
                  { value: ANY, label: "Any" },
                  ...[1, 2, 3, 4].map((n) => ({
                    value: String(n),
                    label: `${n}+`,
                  })),
                ]),
              )}
              {field(
                "Furnishing",
                select("furnishing", "Furnishing", [
                  { value: ANY, label: "Any" },
                  { value: "furnished", label: "Furnished" },
                  { value: "semi", label: "Semi-furnished" },
                  { value: "unfurnished", label: "Unfurnished" },
                ]),
              )}
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">
                  Amenities (must have all)
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {amenities.map((a) => (
                    <label
                      key={a.slug}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={selectedAmenities.includes(a.slug)}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...selectedAmenities, a.slug]
                            : selectedAmenities.filter((s) => s !== a.slug);
                          go({ amenities: next.join(",") || undefined });
                        }}
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <SheetFooter className="border-t">
              <Button
                variant="outline"
                onClick={() =>
                  go({
                    type: undefined,
                    min_price: undefined,
                    max_price: undefined,
                    min_beds: undefined,
                    min_baths: undefined,
                    furnishing: undefined,
                    amenities: undefined,
                  })
                }
              >
                Clear filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className="text-muted-foreground text-sm"
          role="status"
          aria-live="polite"
        >
          {pending
            ? "Updating…"
            : total === null
              ? ""
              : `${total} ${total === 1 ? "property" : "properties"}`}
          {Object.keys(state).some((k) => k !== "view" && k !== "sort") && (
            <>
              {" · "}
              <Link
                href={
                  state.view ? `/properties?view=${state.view}` : "/properties"
                }
                className="text-primary underline underline-offset-4"
              >
                Clear all
              </Link>
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          {select("sort", "Sort by", SORTS, "h-10 w-48", "newest")}
          <div
            className="bg-muted flex rounded-lg p-1"
            role="group"
            aria-label="View"
          >
            <Link
              href={searchHref(state, { view: undefined, bbox: undefined })}
              aria-current={state.view !== "map" ? "true" : undefined}
              className="aria-[current=true]:bg-background flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium aria-[current=true]:shadow-sm"
            >
              <ListIcon className="size-4" aria-hidden /> List
            </Link>
            <Link
              href={searchHref(state, { view: "map", page: undefined })}
              aria-current={state.view === "map" ? "true" : undefined}
              className="aria-[current=true]:bg-background flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium aria-[current=true]:shadow-sm"
            >
              <MapIcon className="size-4" aria-hidden /> Map
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
