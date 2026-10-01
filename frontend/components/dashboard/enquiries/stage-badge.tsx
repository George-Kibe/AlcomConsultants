import { cn } from "@/lib/utils";

import { stageLabel } from "@/lib/enquiries";

const STYLES: Record<string, string> = {
  new: "bg-primary/10 text-primary ring-primary/30 dark:text-foreground",
  contacted: "bg-sky-500/10 text-sky-800 ring-sky-600/30 dark:text-sky-300",
  viewing:
    "bg-violet-500/10 text-violet-800 ring-violet-600/30 dark:text-violet-300",
  negotiating:
    "bg-amber-500/10 text-amber-800 ring-amber-600/30 dark:text-amber-300",
  won: "bg-success/10 text-success ring-success/30",
  lost: "bg-muted text-muted-foreground ring-border",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        STYLES[stage],
      )}
    >
      {stageLabel(stage)}
    </span>
  );
}
