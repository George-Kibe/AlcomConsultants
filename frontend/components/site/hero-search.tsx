import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const dealTypes = [
  { value: "sale", label: "Buy" },
  { value: "rent", label: "Rent" },
  { value: "commercial", label: "Commercial" },
];

/**
 * Plain GET form: works without JavaScript and hands its query to /properties,
 * where full search arrives in Phase 2.
 */
export function HeroSearch() {
  return (
    <form
      action="/properties"
      method="get"
      role="search"
      aria-label="Search properties"
      className="bg-background/95 text-foreground w-full max-w-2xl rounded-2xl p-3 shadow-2xl backdrop-blur"
    >
      <fieldset className="mb-3 flex gap-1">
        <legend className="sr-only">I want to</legend>
        {dealTypes.map((deal, i) => (
          <label key={deal.value} className="cursor-pointer">
            <input
              type="radio"
              name="deal"
              value={deal.value}
              defaultChecked={i === 0}
              className="peer sr-only"
            />
            <span className="text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-ring/50 hover:text-foreground peer-checked:hover:text-primary-foreground block rounded-lg px-4 py-2 text-sm font-medium transition-colors peer-focus-visible:ring-3">
              {deal.label}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="hero-location" className="sr-only">
          Location
        </label>
        <input
          id="hero-location"
          name="q"
          type="search"
          placeholder="Area, town or county, e.g. Kilimani"
          autoComplete="off"
          className="bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 h-12 w-full rounded-xl border px-4 text-base outline-none focus-visible:ring-3 sm:flex-1"
        />
        <Button type="submit" size="xl" className="h-12">
          <SearchIcon data-icon="inline-start" />
          Search
        </Button>
      </div>
    </form>
  );
}
