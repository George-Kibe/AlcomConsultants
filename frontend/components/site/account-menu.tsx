"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  BellIcon,
  HeartIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UserIcon,
  UserRoundCogIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/api/auth";
import { forgetViewer, useViewer } from "@/lib/api/visitor";
import { signInHref } from "@/lib/intent";

function initials(name: string, email: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]);
  return (letters.join("") || email[0]).toUpperCase();
}

/** Header: "Sign in" for visitors, or their account menu once signed in. */
export function AccountMenu() {
  const viewer = useViewer();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = viewer.data;

  if (viewer.isPending) {
    return <span className="bg-muted size-9 animate-pulse rounded-full" />;
  }
  if (!me) {
    const onAuthPage = pathname.startsWith("/account/");
    return (
      <Button asChild variant="ghost" size="lg">
        <Link href={onAuthPage ? "/account/sign-in" : signInHref(pathname)}>
          <UserIcon className="size-5" data-icon="inline-start" />
          <span className="max-sm:sr-only">Sign in</span>
        </Link>
      </Button>
    );
  }

  async function signOut() {
    await logout();
    forgetViewer(queryClient);
    if (pathname.startsWith("/account")) router.replace("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Your account"
          className="rounded-full"
        >
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
            {initials(me.full_name, me.email)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{me.full_name || "Your account"}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {me.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/favourites">
            <HeartIcon />
            Saved properties
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/saved-searches">
            <BellIcon />
            Saved searches
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/profile">
            <UserRoundCogIcon />
            Profile and settings
          </Link>
        </DropdownMenuItem>
        {me.is_staff && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboardIcon />
              Staff dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
