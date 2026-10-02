"use client";

import { PlusIcon } from "lucide-react";
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
import { useOrderedMutations, type Faq } from "@/lib/api/content";

import { Field } from "../form-parts";
import { ContentHeader } from "./content-tabs";
import { FormDialog } from "./form-dialog";
import { OrderedList } from "./ordered-list";

export const FAQ_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "buying", label: "Buying and renting" },
  { value: "selling", label: "Selling and letting" },
  { value: "management", label: "Property management" },
  { value: "valuation", label: "Valuations" },
  { value: "assets", label: "Asset management" },
  { value: "survey", label: "Land surveys" },
] as const;
const categoryLabel = (v?: string) =>
  FAQ_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export function FaqManager() {
  const id = useId();
  const [editing, setEditing] = useState<Faq | null | undefined>(undefined);
  const [category, setCategory] = useState<string>("general");
  const { save } = useOrderedMutations("faqs");

  const open = (faq: Faq | null) => {
    setCategory(faq?.category ?? "general");
    setEditing(faq);
  };

  return (
    <div className="flex flex-col gap-6">
      <ContentHeader
        description="Questions shown on the Contact page, and on each service page by category."
        action={
          <Button size="xl" onClick={() => open(null)}>
            <PlusIcon data-icon="inline-start" />
            Add FAQ
          </Button>
        }
      />
      <OrderedList
        resource="faqs"
        noun="FAQ"
        label={(f: Faq) => f.question}
        onEdit={(f: Faq) => open(f)}
        render={(f: Faq) => (
          <>
            <p className="font-medium">{f.question}</p>
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
              {categoryLabel(f.category)} · {f.answer}
            </p>
          </>
        )}
        empty={<p className="text-muted-foreground">No FAQs yet.</p>}
      />
      <FormDialog
        key={editing?.uuid ?? (editing === null ? "new" : "closed")}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? "Edit FAQ" : "Add FAQ"}
        save={(form) =>
          save.mutateAsync({
            uuid: editing?.uuid,
            body: {
              question: String(form.get("question")),
              answer: String(form.get("answer")),
              category,
            },
          })
        }
      >
        {(errors) => (
          <>
            <Field label="Question" htmlFor={`${id}-q`} error={errors.question}>
              <Input
                id={`${id}-q`}
                name="question"
                defaultValue={editing?.question}
                required
                className="h-11"
              />
            </Field>
            <Field label="Answer" htmlFor={`${id}-a`} error={errors.answer}>
              <Textarea
                id={`${id}-a`}
                name="answer"
                rows={5}
                defaultValue={editing?.answer}
                required
              />
            </Field>
            <Field
              label="Category"
              htmlFor={`${id}-c`}
              hint="Decides which service pages show it. All FAQs appear on the Contact page."
            >
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id={`${id}-c`} className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAQ_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
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
