"use client";

import {
  ArchiveIcon,
  BellRingIcon,
  CalendarClockIcon,
  InboxIcon,
  FileEditIcon,
  HandshakeIcon,
  HomeIcon,
  StarIcon,
  type LucideIcon,
} from "lucide-react";

import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { useEnquirySummary, useMe, useOverview } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

type Stat = {
  key: "listed" | "drafts" | "under_offer" | "closed" | "featured";
  label: string;
  icon: LucideIcon;
};

const stats: Stat[] = [
  { key: "listed", label: "Live listings", icon: HomeIcon },
  { key: "drafts", label: "Drafts", icon: FileEditIcon },
  { key: "under_offer", label: "Under offer", icon: HandshakeIcon },
  { key: "closed", label: "Sold or let", icon: ArchiveIcon },
  { key: "featured", label: "Featured on home page", icon: StarIcon },
];

const leads = [
  {
    key: "new",
    label: "New enquiries",
    href: "/dashboard/enquiries",
    icon: InboxIcon,
  },
  {
    key: "due",
    label: "Follow-ups due",
    href: "/dashboard/enquiries?view=due",
    icon: CalendarClockIcon,
  },
  {
    key: "mine",
    label: "Open leads assigned to you",
    href: "/dashboard/enquiries?view=mine",
    icon: BellRingIcon,
  },
] as const;

export default function OverviewPage() {
  const me = useMe();
  const overview = useOverview();
  const summary = useEnquirySummary();
  const name = me.data?.first_name;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {name ? `Welcome back, ${name}` : "Welcome back"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what needs your attention today.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3" aria-label="Enquiries">
        {leads.map(({ key, label, href, icon: Icon }) => {
          const n = summary.data?.[key];
          return (
            <li key={key}>
              <Link
                href={href}
                className={cn(
                  "bg-card hover:border-primary/40 flex h-full flex-col rounded-2xl border p-5 transition-colors",
                  key === "due" && !!n && "border-destructive/50",
                )}
              >
                <Icon
                  className={cn(
                    "mb-3 size-6",
                    key === "due" && n ? "text-destructive" : "text-success",
                  )}
                  aria-hidden
                />
                {n === undefined ? (
                  <Skeleton className="h-9 w-12" />
                ) : (
                  <p className="text-3xl font-bold" data-testid={`lead-${key}`}>
                    {n}
                  </p>
                )}
                <p className="text-muted-foreground mt-1 text-sm">{label}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      <h2 className="text-lg font-semibold">Listings</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(({ key, label, icon: Icon }) => (
          <li key={key} className="bg-card rounded-2xl border p-5">
            <Icon className="text-success mb-3 size-6" aria-hidden />
            {overview.data ? (
              <p className="text-3xl font-bold" data-testid={`stat-${key}`}>
                {overview.data[key]}
              </p>
            ) : (
              <Skeleton className="h-9 w-12" />
            )}
            <p className="text-muted-foreground mt-1 text-sm">{label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
