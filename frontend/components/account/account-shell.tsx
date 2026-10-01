"use client";

import { BellIcon, HeartIcon, UserRoundCogIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useViewer } from "@/lib/api/visitor";
import { signInHref } from "@/lib/intent";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account/favourites", label: "Saved properties", icon: HeartIcon },
  { href: "/account/saved-searches", label: "Saved searches", icon: BellIcon },
  {
    href: "/account/profile",
    label: "Profile and settings",
    icon: UserRoundCogIcon,
  },
];

/** Signed-in visitor area: heading, section tabs; sends signed-out visitors to sign in. */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const viewer = useViewer();
  const pathname = usePathname();
  const router = useRouter();
  const signedOut = viewer.isSuccess && viewer.data === null;

  useEffect(() => {
    if (signedOut) router.replace(signInHref(pathname));
  }, [signedOut, router, pathname]);

  return (
    <div className="container-page flex flex-col gap-6 py-8 sm:py-12">
      <div>
        <p className="text-muted-foreground text-sm">Your account</p>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {viewer.data
            ? `Hello, ${viewer.data.first_name || "there"}`
            : "Your account"}
        </h1>
      </div>
      <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-1 border-b">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium",
                    active
                      ? "border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground border-transparent",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {viewer.data ? (
        children
      ) : viewer.isError ? (
        <p role="alert" className="text-destructive">
          Your account is temporarily unavailable. Please try again shortly.
        </p>
      ) : (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <span className="sr-only">Loading…</span>
        </div>
      )}
    </div>
  );
}
