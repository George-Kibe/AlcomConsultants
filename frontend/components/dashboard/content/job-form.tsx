"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { jobsKey, type Job } from "@/lib/api/content";

import { RichTextEditor } from "../blog/rich-text-editor";
import { Field, Section } from "../form-parts";

const TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship or attachment" },
];
type Errors = Record<string, string | undefined>;
const first = (m: unknown) =>
  Array.isArray(m) ? String(m[0]) : m ? String(m) : undefined;

export function JobForm({ job }: { job?: Job }) {
  const id = useId();
  const f = (n: string) => `${id}-${n}`;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(job?.description ?? "");
  const [type, setType] = useState<string>(job?.employment_type ?? "full_time");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function save(form: FormData, publish?: boolean) {
    setBusy(true);
    setErrors({});
    const body = {
      title: String(form.get("title")),
      summary: String(form.get("summary")),
      location: String(form.get("location")),
      apply_email: String(form.get("apply_email")),
      closing_date: String(form.get("closing_date")) || null,
      employment_type: type as Job["employment_type"],
      description,
      ...(publish !== undefined && { is_published: publish }),
    };
    const result = job
      ? await api.PATCH("/api/v1/dashboard/content/jobs/{uuid}/", {
          params: { path: { uuid: job.uuid } },
          body,
        })
      : await api.POST("/api/v1/dashboard/content/jobs/", { body });
    setBusy(false);
    if (!result.data) {
      const fields = (result.error ?? {}) as Record<string, unknown>;
      setErrors(
        Object.fromEntries(
          Object.entries(fields).map(([k, v]) => [k, first(v)]),
        ),
      );
      return toast.error("Please check the highlighted fields.");
    }
    void queryClient.invalidateQueries({ queryKey: jobsKey });
    toast.success(
      publish === true
        ? "Published"
        : publish === false
          ? "Unpublished"
          : "Saved",
    );
    if (!job) router.replace(`/dashboard/content/careers/${result.data.uuid}`);
    else queryClient.setQueryData([...jobsKey, job.uuid], result.data);
  }

  async function remove() {
    const result = await api.DELETE("/api/v1/dashboard/content/jobs/{uuid}/", {
      params: { path: { uuid: job!.uuid } },
    });
    if (!result.response.ok) return toast.error("Couldn't delete.");
    void queryClient.invalidateQueries({ queryKey: jobsKey });
    toast.success("Job opening deleted");
    router.replace("/dashboard/content/careers");
  }

  const submitter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const native = e.nativeEvent as SubmitEvent;
    const action = (native.submitter as HTMLButtonElement | null)?.value;
    void save(
      new FormData(e.currentTarget),
      action === "publish" ? true : action === "unpublish" ? false : undefined,
    );
  };

  return (
    <form onSubmit={submitter} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link
              href="/dashboard/content/careers"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Careers
            </Link>{" "}
            / {job ? "Edit" : "New"}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {job ? job.title : "Add a job opening"}
          </h1>
        </div>
        {job && (
          <div className="flex gap-2">
            {job.is_published && (
              <Button asChild variant="outline">
                <Link href={`/careers/${job.slug}`} target="_blank">
                  View on site
                  <ExternalLinkIcon data-icon="inline-end" />
                </Link>
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost">
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this job opening?</AlertDialogTitle>
                  <AlertDialogDescription>
                    It disappears from the Careers page for good. To stop
                    applications, set a closing date or unpublish instead.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void remove()}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Section title="The role">
        <Field label="Job title" htmlFor={f("title")} error={errors.title}>
          <Input
            id={f("title")}
            name="title"
            defaultValue={job?.title}
            required
            className="h-11"
          />
        </Field>
        <Field
          label="Summary"
          htmlFor={f("summary")}
          error={errors.summary}
          hint="One or two sentences, shown on the Careers page."
        >
          <Textarea
            id={f("summary")}
            name="summary"
            rows={2}
            maxLength={300}
            defaultValue={job?.summary}
            required
          />
        </Field>
        <div className="flex flex-col gap-2">
          <span id={f("desc-label")} className="text-sm font-medium">
            Full description
          </span>
          <RichTextEditor
            id={f("desc")}
            value={description}
            onChange={setDescription}
            labelledBy={f("desc-label")}
          />
        </div>
      </Section>

      <Section title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor={f("type")}>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id={f("type")} className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Location"
            htmlFor={f("location")}
            error={errors.location}
          >
            <Input
              id={f("location")}
              name="location"
              defaultValue={job?.location ?? "Westlands, Nairobi"}
              className="h-11"
            />
          </Field>
          <Field
            label="Applications go to"
            htmlFor={f("email")}
            error={errors.apply_email}
            hint="Applicants email their CV here."
          >
            <Input
              id={f("email")}
              name="apply_email"
              type="email"
              defaultValue={job?.apply_email ?? "info@alcomconsultants.co.ke"}
              className="h-11"
            />
          </Field>
          <Field
            label="Closing date (optional)"
            htmlFor={f("closing")}
            error={errors.closing_date}
            hint="After this date the opening leaves the Careers page."
          >
            <Input
              id={f("closing")}
              name="closing_date"
              type="date"
              defaultValue={job?.closing_date ?? ""}
              className="h-11"
            />
          </Field>
        </div>
      </Section>

      <div className="bg-background/95 sticky bottom-0 -mx-4 flex flex-col gap-2 border-t px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-xl sm:border">
        {job?.is_published ? (
          <Button
            type="submit"
            value="unpublish"
            variant="outline"
            size="xl"
            disabled={busy}
          >
            Unpublish
          </Button>
        ) : (
          <Button
            type="submit"
            value="publish"
            variant="outline"
            size="xl"
            disabled={busy}
          >
            Publish
          </Button>
        )}
        <Button type="submit" value="save" size="xl" disabled={busy}>
          {busy ? "Saving…" : job ? "Save changes" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
