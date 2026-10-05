"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  EyeIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/dashboard/properties/status-badge";
import { PropertyDetailView } from "@/components/listings/property-detail";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { PropertyCard } from "@/components/site/property-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api, unwrap } from "@/lib/api/client";
import { queryKeys, useMe } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

const LIVE = ["published", "under_offer", "sold", "let"];
const VIEWS = [
  { value: "page", label: "Property page" },
  { value: "card", label: "Search card" },
] as const;
type View = (typeof VIEWS)[number]["value"];

/** Staff preview of a listing, in the website's own layout, before it goes live. */
export default function PropertyPreviewPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("page");
  const me = useMe();
  const signedOut = me.error instanceof ApiError && me.error.status === 403;

  useEffect(() => {
    if (signedOut)
      router.replace(`/dashboard/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, router, pathname]);

  const preview = useQuery({
    queryKey: [...queryKeys.property(uuid), "preview"],
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/dashboard/properties/{uuid}/preview/", {
          params: { path: { uuid } },
        }),
      ),
    enabled: !!me.data?.is_staff,
    staleTime: 0,
  });

  const publish = useMutation({
    mutationFn: async () => {
      const result = await api.PATCH("/api/v1/dashboard/properties/{uuid}/", {
        params: { path: { uuid } },
        body: { status: "published" },
      });
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.property(uuid),
      });
      toast.success("Published. It's now on the website.");
    },
    onError: () =>
      toast.error("Couldn't publish. Open the listing to check its details."),
  });

  if (me.isPending || signedOut || (me.data?.is_staff && preview.isPending)) {
    return (
      <div className="container-page flex flex-col gap-4 py-10" aria-busy>
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="aspect-2/1 w-full rounded-2xl" />
        <span className="sr-only">Loading preview…</span>
      </div>
    );
  }
  if (!me.data?.is_staff || preview.isError) {
    const missing =
      preview.error instanceof ApiError && preview.error.status === 404;
    return (
      <main className="container-page flex flex-col items-start gap-4 py-16">
        <p className="text-lg font-medium">
          {!me.data?.is_staff
            ? "Only staff can preview listings."
            : missing
              ? "This listing doesn't exist (it may have been deleted)."
              : "Couldn't load the preview. Please try again."}
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/properties">Back to properties</Link>
        </Button>
      </main>
    );
  }

  const p = preview.data!;
  const live = LIVE.includes(p.status ?? "");
  const photos = p.media.filter((m) => m.kind === "image").length;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-brand-navy text-white">
        <div className="container-page flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <EyeIcon className="size-5 shrink-0" aria-hidden />
            <p className="font-semibold">Preview</p>
            <span className="rounded-full bg-white px-0.5">
              <StatusBadge status={p.status ?? "draft"} />
            </span>
            <span className="text-sm text-white/80">
              {live
                ? "This is how the listing looks on the website."
                : "Only staff can see this. Visitors can't, until you publish."}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="What to preview"
              className="flex rounded-lg bg-white/10 p-1"
            >
              {VIEWS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  aria-pressed={view === v.value}
                  onClick={() => setView(v.value)}
                  className={cn(
                    "min-h-9 rounded-md px-3 text-sm font-medium",
                    view === v.value
                      ? "text-brand-navy bg-white"
                      : "text-white/80 hover:text-white",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <Button asChild variant="secondary">
              <Link href={`/dashboard/properties/${uuid}`}>
                <ArrowLeftIcon data-icon="inline-start" />
                Back to editing
              </Link>
            </Button>
            {live ? (
              <Button asChild variant="secondary">
                <Link href={`/properties/${p.slug}`} target="_blank">
                  View on site
                  <ExternalLinkIcon data-icon="inline-end" />
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-success hover:bg-success/90 text-white"
                disabled={publish.isPending}
                onClick={() => publish.mutate()}
              >
                {publish.isPending ? "Publishing…" : "Publish"}
              </Button>
            )}
          </div>
        </div>
        {photos === 0 && (
          <p className="container-page flex items-center gap-2 pb-3 text-sm text-amber-200">
            <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
            No photos yet. Listings with photos get far more enquiries.
          </p>
        )}
      </div>

      <Header />
      <main id="main" className="flex flex-1 flex-col">
        {view === "page" ? (
          <PropertyDetailView p={p} preview />
        ) : (
          <div className="container-page flex flex-col gap-4 py-10">
            <p className="text-muted-foreground max-w-2xl">
              How the listing appears on the home page, in search results and
              under &ldquo;Similar properties&rdquo;. Swipe or use the arrows to
              check every photo.
            </p>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <li
                // In the preview, the card opens the preview of the page.
                onClickCapture={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('[aria-label^="Save "]')) {
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (target.closest("a")) {
                    e.preventDefault();
                    setView("page");
                    window.scrollTo({ top: 0 });
                  }
                }}
              >
                <PropertyCard property={p} className="h-full" />
              </li>
            </ul>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
