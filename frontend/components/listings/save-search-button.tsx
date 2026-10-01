"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellIcon, BellRingIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import {
  useResolveViewer,
  useSavedSearches,
  useViewer,
  visitorKeys,
} from "@/lib/api/visitor";
import { rememberIntent, signInHref, takeIntent } from "@/lib/intent";

/** "Save this search": a daily email when new listings match. */
export function SaveSearchButton({ query }: { query: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const viewer = useViewer();
  const resolveViewer = useResolveViewer();
  const signedIn = !!viewer.data;
  const searches = useSavedSearches(signedIn);
  const saved = searches.data?.find((s) => s.query === query);

  const save = useMutation({
    mutationFn: async () => {
      const result = await api.POST("/api/v1/me/saved-searches/", {
        body: { query },
      });
      if (!result.data) {
        const error = result.error as { detail?: string } | undefined;
        throw new Error(error?.detail ?? "Couldn't save this search.");
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: visitorKeys.savedSearches,
      });
      toast.success("Search saved", {
        description: viewer.data?.email_verified
          ? "We'll email you once a day when new properties match."
          : "Confirm your email address to get daily alerts.",
      });
    },
    onError: (e) => toast.error(e.message),
  });

  // Back from signing in: finish saving the search they asked for.
  useEffect(() => {
    if (!signedIn || !searches.isSuccess) return;
    if (takeIntent("search", (i) => i.query === query) && !saved) save.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, searches.isSuccess, query]);

  if (saved) {
    return (
      <Button asChild variant="outline" size="lg">
        <Link href="/account/saved-searches">
          <BellRingIcon data-icon="inline-start" />
          Search saved
        </Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={save.isPending}
      onClick={async () => {
        if (!(await resolveViewer())) {
          rememberIntent({ kind: "search", query });
          router.push(signInHref());
          return;
        }
        save.mutate();
      }}
    >
      <BellIcon data-icon="inline-start" />
      {save.isPending ? "Saving…" : "Save this search"}
    </Button>
  );
}
