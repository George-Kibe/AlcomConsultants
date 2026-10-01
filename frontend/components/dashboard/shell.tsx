"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, LogOutIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "cn";

import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useMe } from "@/lib/api/hooks";

import { dashboardNav } from "./nav";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {dashboardNav.map(({ title, href, icon: Icon }) => {
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium transition-colors",
              active && "bg-secondary text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {title}
          </Link>
        );
      })}
    </nav>
  );
}

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Signed-in dashboard chrome. Redirects to login when the session is gone. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const me = useMe();
  const [menuOpen, setMenuOpen] = useState(false);
  const signedOut = me.error instanceof ApiError && me.error.status === 403;

  useEffect(() => {
    if (signedOut)
      router.replace(`/dashboard/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, router, pathname]);

  async function signOut() {
    await logout();
    queryClient.clear();
    router.replace("/dashboard/login");
  }

  if (me.isPending || signedOut) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center"
        aria-busy="true"
      >
        <Skeleton className="h-8 w-48" />
        <span className="sr-only">Loading dashboard…</span>
      </div>
    );
  }

  if (me.isError || !me.data.is_staff) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <Alert className="max-w-md">
          <AlertTitle>
            {me.isError ? "Couldn't load the dashboard" : "Staff access only"}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            {me.isError
              ? "Please check your connection and try again."
              : "This account doesn't have access to the dashboard."}
            <Button variant="outline" onClick={() => void signOut()}>
              Sign out
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const user = me.data;
  return (
    <div className="bg-muted/40 flex min-h-dvh">
      <aside className="bg-background hidden w-64 shrink-0 flex-col gap-6 border-r p-4 lg:flex">
        <Logo className="px-2" />
        <NavList />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <MenuIcon className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-6 p-4">
              <SheetTitle asChild>
                <div>
                  <Logo />
                </div>
              </SheetTitle>
              <NavList onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex-1" />
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="hidden sm:inline-flex"
          >
            <Link href="/" target="_blank">
              View website
              <ExternalLinkIcon data-icon="inline-end" />
            </Link>
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Account menu">
                <Avatar className="size-8">
                  <AvatarFallback>
                    {initials(user.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span>{user.full_name || "Staff member"}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/security">Security</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
