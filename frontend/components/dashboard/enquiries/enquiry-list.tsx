"use client";

import { CalendarClockIcon, InboxIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDashboardEnquiries,
  useEnquirySummary,
  type EnquiryListParams,
} from "@/lib/api/hooks";
import { KINDS, STAGES, kindLabel } from "@/lib/enquiries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { StageBadge } from "./stage-badge";

type Summary = NonNullable<ReturnType<typeof useEnquirySummary>["data"]>;
type View = {
  value: string;
  label: string;
  params: EnquiryListParams;
  count?: (s: Summary) => number;
};

const VIEWS: View[] = [
  { value: "", label: "Open", params: { stage: "open" }, count: (s) => s.open },
  {
    value: "due",
    label: "Follow-ups due",
    params: { due: true },
    count: (s) => s.due,
  },
  {
    value: "mine",
    label: "Assigned to me",
    params: { stage: "open", assigned: "me" },
    count: (s) => s.mine,
  },
  {
    value: "unassigned",
    label: "Unassigned",
    params: { stage: "open", assigned: "none" },
    count: (s) => s.unassigned,
  },
  {
    value: "won",
    label: "Won",
    params: { stage: "won" },
    count: (s) => s.stages.won ?? 0,
  },
  {
    value: "lost",
    label: "Lost",
    params: { stage: "lost" },
    count: (s) => s.stages.lost ?? 0,
  },
  {
    value: "spam",
    label: "Spam",
    params: { spam: true },
    count: (s) => s.spam,
  },
  { value: "all", label: "All", params: {} },
];

const ANY = "any";

export function EnquiryList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view =
    VIEWS.find((v) => v.value === (params.get("view") ?? "")) ?? VIEWS[0];
  const stage = params.get("stage") ?? "";
  const kind = params.get("kind") ?? "";
  const page = Number(params.get("page") ?? "1");
  const [q, setQ] = useState(params.get("q") ?? "");

  const summary = useEnquirySummary();
  const list = useDashboardEnquiries({
    ...view.params,
    ...(stage && { stage }),
    kind,
    q: params.get("q") ?? "",
    page,
  });

  function update(next: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "" || (k === "page" && v === 1))
        sp.delete(k);
      else sp.set(k, String(v));
    }
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (params.get("q") ?? "")) update({ q, page: 1 });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const rows = list.data?.results ?? [];
  const total = list.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));
  const stageFilter =
    view.value === "" || view.value === "mine" || view.value === "unassigned";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Enquiries</h1>
        <p className="text-muted-foreground mt-1">
          Leads from the website: who to call, what stage they&apos;re at and
          when to follow up.
        </p>
      </div>

      <section
        aria-label="Pipeline"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6"
      >
        {STAGES.map((s) => {
          const n = summary.data?.stages[s.value];
          const active = stageFilter && stage === s.value;
          return (
            <button
              key={s.value}
              type="button"
              aria-pressed={active}
              onClick={() =>
                update({
                  view: s.open ? undefined : s.value,
                  stage: s.open && !active ? s.value : undefined,
                  page: 1,
                })
              }
              className={cn(
                "bg-card hover:border-primary/40 flex flex-col items-start rounded-xl border p-3 text-left transition-colors",
                active && "border-primary ring-primary/30 ring-2",
              )}
            >
              <span className="text-muted-foreground text-xs">{s.label}</span>
              {n === undefined ? (
                <Skeleton className="mt-1 h-7 w-8" />
              ) : (
                <span className="text-2xl font-bold">{n}</span>
              )}
            </button>
          );
        })}
      </section>

      <nav aria-label="Enquiry views" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-1 border-b">
          {VIEWS.map((v) => {
            const active = v.value === view.value;
            const count = summary.data && v.count?.(summary.data);
            return (
              <li key={v.value}>
                <button
                  type="button"
                  onClick={() =>
                    update({ view: v.value, stage: undefined, page: 1 })
                  }
                  aria-current={active ? "page" : undefined}
                  className="text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground -mb-px flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap"
                >
                  {v.label}
                  {count !== undefined && (
                    <span
                      className={cn(
                        "bg-muted rounded-full px-2 text-xs",
                        v.value === "due" &&
                          count > 0 &&
                          "bg-destructive text-white",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Label htmlFor="enquiry-search" className="sr-only">
            Search enquiries
          </Label>
          <SearchIcon
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="enquiry-search"
            type="search"
            placeholder="Search by name, email, phone, reference or property"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <Select
          value={kind || ANY}
          onValueChange={(v) => update({ kind: v === ANY ? "" : v, page: 1 })}
        >
          <SelectTrigger className="h-11 sm:w-56" aria-label="Type of enquiry">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All types</SelectItem>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
          <span className="sr-only">Loading enquiries…</span>
        </div>
      ) : list.isError ? (
        <p className="text-destructive" role="alert">
          Couldn&apos;t load enquiries. Please try again.
        </p>
      ) : rows.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-10 text-center">
          <InboxIcon className="text-muted-foreground size-10" aria-hidden />
          <p className="font-medium">
            {params.get("q") || kind || stage
              ? "No enquiries match."
              : view.value === "due"
                ? "No follow-ups due. Nice work."
                : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <ul
          className="bg-card divide-y rounded-2xl border"
          aria-label="Enquiries"
        >
          {rows.map((e) => (
            <li key={e.uuid}>
              <Link
                href={`/dashboard/enquiries/${e.uuid}`}
                className="hover:bg-muted/60 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{e.name}</span>
                    <StageBadge stage={e.stage ?? "new"} />
                    {e.is_spam && (
                      <span className="text-destructive text-xs font-medium">
                        Spam
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-sm">
                    {e.reference} · {kindLabel(e.kind)}
                    {e.property_label ? ` · ${e.property_label}` : ""}
                  </p>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:justify-end sm:text-right">
                  {e.follow_up_on && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        e.is_overdue && "text-destructive font-medium",
                      )}
                    >
                      <CalendarClockIcon className="size-4" aria-hidden />
                      {e.is_overdue ? "Overdue: " : "Follow up "}
                      {formatDate(e.follow_up_on)}
                    </span>
                  )}
                  <span>{e.assigned_to_name || "Unassigned"}</span>
                  <span>{formatDate(e.created_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between"
        >
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => update({ page: page - 1 })}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {pages} · {total} enquiries
          </span>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => update({ page: page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
