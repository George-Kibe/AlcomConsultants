"use client";

import { PlusIcon, StarIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrderedMutations, type Testimonial } from "@/lib/api/content";

import { Field } from "../form-parts";
import { ContentHeader } from "./content-tabs";
import { FormDialog } from "./form-dialog";
import { OrderedList } from "./ordered-list";

const NONE = "none";

export function TestimonialManager() {
  const id = useId();
  const [editing, setEditing] = useState<Testimonial | null | undefined>(
    undefined,
  );
  const [rating, setRating] = useState<string>(NONE);
  const { save } = useOrderedMutations("testimonials");

  const open = (t: Testimonial | null) => {
    setRating(t?.rating ? String(t.rating) : NONE);
    setEditing(t);
  };

  return (
    <div className="flex flex-col gap-6">
      <ContentHeader
        description="Client quotes shown on the home and About pages (the first six)."
        action={
          <Button size="xl" onClick={() => open(null)}>
            <PlusIcon data-icon="inline-start" />
            Add testimonial
          </Button>
        }
      />
      <OrderedList
        resource="testimonials"
        noun="Testimonial"
        label={(t: Testimonial) => `testimonial from ${t.name}`}
        onEdit={(t: Testimonial) => open(t)}
        render={(t: Testimonial) => (
          <>
            <p className="line-clamp-2">&ldquo;{t.quote}&rdquo;</p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-2 text-sm">
              {t.name}
              {t.role ? `, ${t.role}` : ""}
              {t.rating ? (
                <span className="inline-flex items-center gap-0.5">
                  · {t.rating}
                  <StarIcon className="size-3.5" aria-label="stars" />
                </span>
              ) : null}
            </p>
          </>
        )}
        empty={
          <p className="text-muted-foreground">
            No testimonials yet. The section stays hidden on the website until
            you add one.
          </p>
        }
      />
      <FormDialog
        key={editing?.uuid ?? (editing === null ? "new" : "closed")}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? "Edit testimonial" : "Add testimonial"}
        description="Only publish quotes the client has agreed to share."
        save={(form) =>
          save.mutateAsync({
            uuid: editing?.uuid,
            body: {
              quote: String(form.get("quote")),
              name: String(form.get("name")),
              role: String(form.get("role")),
              rating: rating === NONE ? null : Number(rating),
            },
          })
        }
      >
        {(errors) => (
          <>
            <Field label="Quote" htmlFor={`${id}-q`} error={errors.quote}>
              <Textarea
                id={`${id}-q`}
                name="quote"
                rows={4}
                maxLength={800}
                defaultValue={editing?.quote}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Client name"
                htmlFor={`${id}-n`}
                error={errors.name}
              >
                <Input
                  id={`${id}-n`}
                  name="name"
                  defaultValue={editing?.name}
                  required
                  className="h-11"
                />
              </Field>
              <Field
                label="Role or place (optional)"
                htmlFor={`${id}-r`}
                hint='e.g. "Landlord, Kilimani"'
              >
                <Input
                  id={`${id}-r`}
                  name="role"
                  defaultValue={editing?.role}
                  className="h-11"
                />
              </Field>
            </div>
            <Field
              label="Rating (optional)"
              htmlFor={`${id}-s`}
              error={errors.rating}
            >
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger id={`${id}-s`} className="h-11 w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No rating</SelectItem>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} star{n > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
      </FormDialog>
    </div>
  );
}
