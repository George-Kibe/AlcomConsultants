"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useOrderedList,
  useOrderedMutations,
  type OrderedResource,
} from "@/lib/api/content";

type Item = { uuid: string; is_published?: boolean };

/**
 * Items in website order: move up or down, show or hide, edit, delete.
 * `label` names an item for screen readers and dialogs ("FAQ: How do I…").
 */
export function OrderedList<R extends OrderedResource>({
  resource,
  noun,
  label,
  render,
  onEdit,
  empty,
}: {
  resource: R;
  noun: string;
  label: (item: never) => string;
  render: (item: never) => React.ReactNode;
  onEdit: (item: never) => void;
  empty: React.ReactNode;
}) {
  const list = useOrderedList(resource);
  const { save, remove, reorder } = useOrderedMutations(resource);
  const items = (list.data ?? []) as unknown as Item[];

  if (list.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    );
  }
  if (list.isError) {
    return (
      <p role="alert" className="text-destructive">
        Couldn&apos;t load this list. Please try again.
      </p>
    );
  }
  if (items.length === 0) return <>{empty}</>;

  const move = (index: number, step: number) => {
    const uuids = items.map((i) => i.uuid);
    const [moved] = uuids.splice(index, 1);
    uuids.splice(index + step, 0, moved);
    reorder.mutate(uuids, {
      onError: () => toast.error("Couldn't save the new order."),
    });
  };

  return (
    <ol className="bg-card divide-y rounded-2xl border" aria-label={`${noun}s`}>
      {items.map((item, index) => {
        const name = label(item as never);
        return (
          <li
            key={item.uuid}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">{render(item as never)}</div>
            <div className="flex flex-wrap items-center gap-1">
              <label className="mr-2 flex items-center gap-2 text-sm">
                <Switch
                  checked={item.is_published ?? false}
                  disabled={save.isPending}
                  aria-label={`Show ${name} on the website`}
                  onCheckedChange={(shown) =>
                    save.mutate(
                      { uuid: item.uuid, body: { is_published: shown } },
                      {
                        onSuccess: () =>
                          toast.success(
                            shown ? "Shown on the website" : "Hidden",
                          ),
                        onError: () => toast.error("Couldn't update."),
                      },
                    )
                  }
                />
                Shown
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={`Move ${name} up`}
                disabled={index === 0 || reorder.isPending}
                onClick={() => move(index, -1)}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={`Move ${name} down`}
                disabled={index === items.length - 1 || reorder.isPending}
                onClick={() => move(index, 1)}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={`Edit ${name}`}
                onClick={() => onEdit(item as never)}
              >
                <PencilIcon />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Delete ${name}`}
                  >
                    <Trash2Icon />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete this {noun.toLowerCase()}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      &ldquo;{name}&rdquo; is removed from the website for good.
                      To take it down temporarily, switch &ldquo;Shown&rdquo;
                      off instead.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        remove.mutate(item.uuid, {
                          onSuccess: () => toast.success(`${noun} deleted`),
                          onError: () => toast.error("Couldn't delete."),
                        })
                      }
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
