import { cn } from "cn";

import { STATUSES } from "@/lib/listing-form";

const STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground ring-border",
  published: "bg-success/10 text-success ring-success/30",
  under_offer:
    "bg-amber-500/10 text-amber-800 ring-amber-600/30 dark:text-amber-300",
  sold: "bg-secondary text-secondary-foreground ring-border",
  let: "bg-secondary text-secondary-foreground ring-border",
  archived:
    "bg-muted text-muted-foreground ring-border line-through decoration-1",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUSES.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
      )}
    >
      {label}
    </span>
  );
}
