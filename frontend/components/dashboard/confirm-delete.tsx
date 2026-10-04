"use client";

import { Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * A Delete button that asks for confirmation first.
 * `icon` gives the compact trash button used on list rows; `name` labels it for
 * screen readers ("Delete Westlands office").
 */
export function ConfirmDelete({
  name,
  title,
  description,
  onConfirm,
  icon = false,
  disabled = false,
}: {
  name: string;
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  icon?: boolean;
  disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {icon ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            disabled={disabled}
            aria-label={`Delete ${name}`}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2Icon />
          </Button>
        ) : (
          <Button type="button" variant="destructive" disabled={disabled}>
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Confirmation text for deleting a listing (edit page and list rows). */
export function deleteListingText(p: {
  reference?: string | null;
  status?: string;
}) {
  const live = p.status !== "draft" && p.status !== "archived";
  return (
    `${p.reference ?? "This listing"} and its photos will be removed` +
    (live ? " and taken off the website straight away" : "") +
    ". Enquiries about it are kept. This can't be undone." +
    (live
      ? " To take it down for now, set its status to Archived instead."
      : "")
  );
}

/** Confirmation text for deleting a blog article (edit page and list rows). */
export function deleteArticleText(p: { status?: string }) {
  return p.status === "published"
    ? "The article is taken off the website straight away, with its comments and cover photo. This can't be undone. To take it down for now, unpublish it instead."
    : "The article, its comments and its cover photo will be removed. This can't be undone.";
}
