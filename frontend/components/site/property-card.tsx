import {
  BathIcon,
  BedDoubleIcon,
  ImageOffIcon,
  MapPinIcon,
  RulerIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "cn";

import { CloudImage } from "@/components/cloud-image";
import { FavouriteButton } from "@/components/listings/favourite-button";
import { formatListingPrice } from "@/lib/format";
import { locationLabel, type PropertyListItem } from "@/lib/listings";

const DEAL_LABEL: Record<string, string> = {
  sale: "For Sale",
  rent: "For Rent",
  lease: "To Lease",
};
const STATUS_LABEL: Record<string, string> = {
  under_offer: "Under offer",
  sold: "Sold",
  let: "Let",
};

export function PropertyCard({
  property,
  className,
  headingLevel = "h3",
}: {
  property: PropertyListItem;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const {
    title,
    slug,
    deal_type,
    status,
    price,
    price_unit,
    price_on_request,
    bedrooms,
    bathrooms,
  } = property;
  const area = property.built_area_sqm
    ? `${Number(property.built_area_sqm)} m²`
    : null;
  const Heading = headingLevel;
  const cover = property.cover_image;
  const flag = status && STATUS_LABEL[status];

  return (
    <article
      className={cn(
        "group bg-card relative flex flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg",
        className,
      )}
    >
      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        {cover ? (
          <CloudImage
            src={cover.public_id}
            alt={cover.alt_text || title}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 85vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <span className="text-muted-foreground flex h-full items-center justify-center">
            <ImageOffIcon className="size-8" aria-label="No photo yet" />
          </span>
        )}
        <span
          className={cn(
            "absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
            deal_type === "sale"
              ? "bg-brand-navy text-white"
              : "bg-success text-success-foreground",
          )}
        >
          {DEAL_LABEL[deal_type]}
        </span>
        {flag && (
          <span className="bg-background/95 text-foreground absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
            {flag}
          </span>
        )}
        {/* Above the card's stretched link, so it gets its own clicks. */}
        <FavouriteButton
          slug={slug}
          title={title}
          className="absolute right-3 bottom-3 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPinIcon className="size-4 shrink-0" aria-hidden />
          {locationLabel(property)}
        </p>
        <Heading className="text-lg font-semibold">
          {/* Stretched link: the whole card is clickable, with one accessible link name. */}
          <Link
            href={`/properties/${slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {title}
          </Link>
        </Heading>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {bedrooms != null && (
            <li className="flex items-center gap-1.5">
              <BedDoubleIcon
                className="text-muted-foreground size-4"
                aria-hidden
              />
              {bedrooms === 0 ? (
                "Studio"
              ) : (
                <>
                  {bedrooms} <span className="sr-only">bedrooms</span>
                  <span aria-hidden>bd</span>
                </>
              )}
            </li>
          )}
          {bathrooms != null && (
            <li className="flex items-center gap-1.5">
              <BathIcon className="text-muted-foreground size-4" aria-hidden />
              {bathrooms} <span className="sr-only">bathrooms</span>
              <span aria-hidden>ba</span>
            </li>
          )}
          {area && (
            <li className="flex items-center gap-1.5">
              <RulerIcon className="text-muted-foreground size-4" aria-hidden />
              {area}
            </li>
          )}
        </ul>
        <p className="text-primary mt-auto pt-3 text-lg font-bold">
          {formatListingPrice(price, price_unit, price_on_request)}
        </p>
      </div>
      <span
        aria-hidden
        className="ring-primary/50 pointer-events-none absolute inset-0 rounded-2xl group-has-[a:focus-visible]:ring-3"
      />
    </article>
  );
}
