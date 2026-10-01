"use client";

import {
  ArchiveIcon,
  FileEditIcon,
  HandshakeIcon,
  HomeIcon,
  StarIcon,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useMe, useOverview } from "@/lib/api/hooks";

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

export default function OverviewPage() {
  const me = useMe();
  const overview = useOverview();
  const name = me.data?.first_name;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {name ? `Welcome back, ${name}` : "Welcome back"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s how your listings look today.
        </p>
      </div>
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
