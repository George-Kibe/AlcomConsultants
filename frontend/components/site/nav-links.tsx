"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

import type { NavItem } from "@/lib/site-config";

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

type NavLinksProps = {
  items: NavItem[];
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
};

export function NavLinks({
  items,
  className,
  linkClassName,
  onNavigate,
}: NavLinksProps) {
  const pathname = usePathname();

  return (
    <ul className={className}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-muted-foreground hover:text-foreground aria-[current=page]:text-primary rounded-lg font-medium transition-colors",
                linkClassName,
              )}
            >
              {item.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
