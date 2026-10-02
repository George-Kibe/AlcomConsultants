"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SaveError } from "@/lib/api/content";

export type FieldErrors = Record<string, string | undefined>;
const first = (m: unknown) =>
  Array.isArray(m) ? String(m[0]) : m ? String(m) : undefined;

/**
 * Add or edit one item in a dialog. `save` receives the form data; field errors from the
 * API are passed back to `children` so each field can show its own message.
 */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  save,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  save: (form: FormData) => Promise<unknown>;
  children: (errors: FieldErrors) => React.ReactNode;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await save(new FormData(e.currentTarget));
      toast.success("Saved");
      onClose();
    } catch (err) {
      if (err instanceof SaveError) {
        setErrors(
          Object.fromEntries(
            Object.entries(err.fields).map(([k, v]) => [k, first(v)]),
          ),
        );
      }
      toast.error("Please check the highlighted fields.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setErrors({});
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          {children(errors)}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
