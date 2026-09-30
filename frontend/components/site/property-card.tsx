import Image from "next/image";
import Link from "next/link";
import { BathIcon, BedDoubleIcon, MapPinIcon, RulerIcon } from "lucide-react";
import { cn } from "cn";

import {
  dealTypeLabel,
  formatPrice,
  type PropertySummary,
} from "@/lib/properties";

export function PropertyCard({
  property,
  className,
}: {
  property: PropertySummary;
  className?: string;
}) {
  const {
    title,
    location,
    summary,
    dealType,
    price,
    bedrooms,
    bathrooms,
    areaSqm,
    image,
  } = property;

  return (
    <article
      className={cn(
        "group bg-card relative flex flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 85vw"
          placeholder={image.blurDataURL ? "blur" : "empty"}
          blurDataURL={image.blurDataURL}
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
        <span
          className={cn(
            "absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
            dealType === "sale"
              ? "bg-brand-navy text-white"
              : "bg-success text-success-foreground",
          )}
        >
          {dealTypeLabel[dealType]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPinIcon className="size-4 shrink-0" aria-hidden />
          {location}
        </p>
        <h3 className="text-lg font-semibold">
          {/* Stretched link: the whole card is clickable, with one accessible link name. */}
          <Link
            href="/properties"
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {title}
          </Link>
        </h3>
        <p className="text-muted-foreground line-clamp-2 text-sm">{summary}</p>

        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {bedrooms !== undefined && (
            <li className="flex items-center gap-1.5">
              <BedDoubleIcon
                className="text-muted-foreground size-4"
                aria-hidden
              />
              {bedrooms} <span className="sr-only">bedrooms</span>
              <span aria-hidden>bd</span>
            </li>
          )}
          {bathrooms !== undefined && (
            <li className="flex items-center gap-1.5">
              <BathIcon className="text-muted-foreground size-4" aria-hidden />
              {bathrooms} <span className="sr-only">bathrooms</span>
              <span aria-hidden>ba</span>
            </li>
          )}
          {areaSqm !== undefined && (
            <li className="flex items-center gap-1.5">
              <RulerIcon className="text-muted-foreground size-4" aria-hidden />
              {areaSqm} m²
            </li>
          )}
        </ul>

        <p className="text-primary mt-auto pt-3 text-lg font-bold">
          {formatPrice(price, dealType)}
        </p>
      </div>
      <span
        aria-hidden
        className="ring-primary/50 pointer-events-none absolute inset-0 rounded-2xl group-has-[a:focus-visible]:ring-3"
      />
    </article>
  );
}
