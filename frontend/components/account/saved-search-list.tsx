"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellIcon, SearchIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { resendVerification } from "@/lib/api/auth";
import { ApiError, api } from "@/lib/api/client";
import {
  useSavedSearches,
  useViewer,
  visitorKeys,
  type SavedSearch,
} from "@/lib/api/visitor";
import { formatDate } from "@/lib/format";

function useUpdateSearch() {
  const queryClient = useQueryClient();
  const update = (next: SavedSearch[] | undefined) =>
    queryClient.setQueryData(visitorKeys.savedSearches, next);
  return {
    toggle: useMutation({
      mutationFn: async ({
        uuid,
        alerts,
      }: {
        uuid: string;
        alerts: boolean;
      }) => {
        const result = await api.PATCH("/api/v1/me/saved-searches/{uuid}/", {
          params: { path: { uuid } },
          body: { alerts },
        });
        if (!result.data) throw new ApiError(result.response.status);
        return result.data;
      },
      onSuccess: (saved) => {
        update(
          queryClient
            .getQueryData<SavedSearch[]>(visitorKeys.savedSearches)
            ?.map((s) => (s.uuid === saved.uuid ? saved : s)),
        );
        toast.success(
          saved.alerts ? "Daily email switched on" : "Daily email switched off",
        );
      },
      onError: () => toast.error("Couldn't update the alert."),
    }),
    remove: useMutation({
      mutationFn: async (uuid: string) => {
        const result = await api.DELETE("/api/v1/me/saved-searches/{uuid}/", {
          params: { path: { uuid } },
        });
        if (!result.response.ok) throw new ApiError(result.response.status);
        return uuid;
      },
      onSuccess: (uuid) => {
        update(
          queryClient
            .getQueryData<SavedSearch[]>(visitorKeys.savedSearches)
            ?.filter((s) => s.uuid !== uuid),
        );
        toast.success("Saved search deleted");
      },
      onError: () => toast.error("Couldn't delete the search."),
    }),
  };
}

function ConfirmEmailNotice({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  return (
    <Alert>
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>
          Confirm your email address to receive daily alerts. We sent a link to{" "}
          <strong>{email}</strong>.
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sent}
          onClick={async () => {
            await resendVerification(email);
            setSent(true);
          }}
        >
          {sent ? "Link sent" : "Send the link again"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function SavedSearchList() {
  const viewer = useViewer();
  const searches = useSavedSearches();
  const { toggle, remove } = useUpdateSearch();

  if (searches.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <span className="sr-only">Loading saved searches…</span>
      </div>
    );
  }
  if (searches.isError) {
    return (
      <p role="alert" className="text-destructive">
        Couldn&apos;t load your saved searches. Please try again.
      </p>
    );
  }
  if (searches.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
        <BellIcon className="text-muted-foreground size-10" aria-hidden />
        <h2 className="text-xl font-semibold">No saved searches yet</h2>
        <p className="text-muted-foreground max-w-md">
          Search for properties, then choose &ldquo;Save this search&rdquo;.
          We&apos;ll email you once a day when new listings match.
        </p>
        <Button asChild size="lg">
          <Link href="/properties">Search properties</Link>
        </Button>
      </div>
    );
  }

  const me = viewer.data;
  return (
    <section aria-label="Saved searches" className="flex flex-col gap-4">
      {me && !me.email_verified && <ConfirmEmailNotice email={me.email} />}
      <p className="text-muted-foreground text-sm">
        New matches are emailed once a day, in the morning.
      </p>
      <ul className="flex flex-col gap-3">
        {searches.data.map((s) => (
          <li
            key={s.uuid}
            className="bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <h2 className="font-semibold">{s.name}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {s.match_count}{" "}
                {s.match_count === 1 ? "property" : "properties"} now · saved{" "}
                {formatDate(s.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={s.alerts}
                  disabled={toggle.isPending}
                  onCheckedChange={(alerts) =>
                    toggle.mutate({ uuid: s.uuid, alerts })
                  }
                  aria-label={`Daily email for ${s.name}`}
                />
                Daily email
              </label>
              <Button asChild variant="outline">
                <Link href={s.path}>
                  <SearchIcon data-icon="inline-start" />
                  View results
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={`Delete ${s.name}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(s.uuid)}
              >
                <Trash2Icon />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
