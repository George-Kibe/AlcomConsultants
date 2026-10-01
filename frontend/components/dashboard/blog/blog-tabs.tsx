"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/blog", label: "Articles" },
  { href: "/dashboard/blog/comments", label: "Comments" },
];

/** Switch between the blog's articles and comments screens. */
export function BlogTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Blog" className="bg-muted flex w-fit rounded-lg p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname === tab.href ? "page" : undefined}
          className="aria-[current=page]:bg-background text-muted-foreground aria-[current=page]:text-foreground flex h-9 items-center rounded-md px-4 text-sm font-medium aria-[current=page]:shadow-sm"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
