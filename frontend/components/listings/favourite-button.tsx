"use client";

import { HeartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useFavouriteSlugs,
  useResolveViewer,
  useToggleFavourite,
  useViewer,
} from "@/lib/api/visitor";
import { rememberIntent, signInHref, takeIntent } from "@/lib/intent";
import { cn } from "@/lib/utils";

/**
 * Save a property. Signed-out visitors are sent to sign in and the property is saved
 * when they come back.
 */
export function FavouriteButton({
  slug,
  title,
  variant = "icon",
  className,
}: {
  slug: string;
  title: string;
  variant?: "icon" | "labelled";
  className?: string;
}) {
  const router = useRouter();
  const viewer = useViewer();
  const resolveViewer = useResolveViewer();
  const signedIn = !!viewer.data;
  const slugs = useFavouriteSlugs(signedIn);
  const toggle = useToggleFavourite();
  const saved = !!slugs.data?.includes(slug);

  const save = (next: boolean) =>
    toggle.mutate(
      { slug, save: next },
      {
        onSuccess: () =>
          toast.success(next ? "Saved to your properties" : "Removed", {
            action: next
              ? {
                  label: "View",
                  onClick: () => router.push("/account/favourites"),
                }
              : undefined,
          }),
        onError: () => toast.error("Couldn't update your saved properties."),
      },
    );

  // Back from signing in: finish saving the property they tapped.
  useEffect(() => {
    if (!signedIn || !slugs.isSuccess) return;
    if (takeIntent("favourite", (i) => i.slug === slug) && !saved) save(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, slugs.isSuccess, slug]);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!(await resolveViewer())) {
      rememberIntent({ kind: "favourite", slug });
      router.push(signInHref());
      return;
    }
    save(!saved);
  }

  const icon = (
    <HeartIcon
      aria-hidden
      className={cn(
        "size-5 transition-colors",
        saved && "fill-destructive text-destructive",
      )}
    />
  );

  if (variant === "labelled") {
    return (
      <Button
        type="button"
        variant="outline"
        size="xl"
        aria-pressed={saved}
        onClick={(e) => void onClick(e)}
        className={className}
      >
        {icon}
        {saved ? "Saved" : "Save property"}
      </Button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`Save ${title}`}
      title={saved ? "Saved: tap to remove" : "Save this property"}
      onClick={(e) => void onClick(e)}
      className={cn(
        "bg-background/95 text-foreground hover:bg-background focus-visible:ring-ring/50 flex size-10 items-center justify-center rounded-full shadow-sm outline-none focus-visible:ring-3",
        className,
      )}
    >
      {icon}
    </button>
  );
}
