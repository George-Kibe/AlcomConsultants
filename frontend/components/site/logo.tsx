import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";

import { siteConfig } from "@/lib/site-config";

type LogoProps = {
  className?: string;
  /** Use the light artwork regardless of theme (for always-dark surfaces). */
  onDark?: boolean;
};

export function Logo({ className, onDark = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-lg whitespace-nowrap",
        className,
      )}
      aria-label={`${siteConfig.name}, home`}
    >
      <Image
        src="/brand/alcom-mark.png"
        alt=""
        width={364}
        height={256}
        loading="eager"
        className={cn("h-9 w-auto", onDark ? "hidden" : "dark:hidden")}
      />
      <Image
        src="/brand/alcom-mark-light.png"
        alt=""
        width={364}
        height={256}
        loading="eager"
        className={cn("h-9 w-auto", onDark ? "block" : "hidden dark:block")}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-lg font-bold tracking-wide",
            onDark
              ? "text-inverse-foreground"
              : "text-brand-navy dark:text-foreground",
          )}
        >
          ALCOM
        </span>
        <span
          className={cn(
            "text-[0.65rem] font-medium tracking-[0.12em] uppercase",
            onDark ? "text-brand-green" : "text-success",
          )}
        >
          Consultants Limited
        </span>
      </span>
    </Link>
  );
}
