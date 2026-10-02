"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/content/team", label: "Team" },
  { href: "/dashboard/content/testimonials", label: "Testimonials" },
  { href: "/dashboard/content/faqs", label: "FAQs" },
  { href: "/dashboard/content/careers", label: "Careers" },
];

/** Header and section switcher for the site content screens. */
export function ContentHeader({
  description,
  action,
}: {
  description: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Site content</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        {action}
      </div>
      <nav
        aria-label="Site content"
        className="bg-muted flex w-fit max-w-full overflow-x-auto rounded-lg p-1"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={pathname.startsWith(tab.href) ? "page" : undefined}
            className="aria-[current=page]:bg-background text-muted-foreground aria-[current=page]:text-foreground flex h-9 items-center rounded-md px-4 text-sm font-medium whitespace-nowrap aria-[current=page]:shadow-sm"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
