"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BriefcaseIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api } from "@/lib/api/client";
import { jobsKey, useJobs } from "@/lib/api/content";
import { formatDate } from "@/lib/format";

import { ConfirmDelete } from "../confirm-delete";
import { ContentHeader } from "./content-tabs";

function JobStatus({
  published,
  open,
}: {
  published?: boolean;
  open: boolean;
}) {
  const [label, style] = !published
    ? ["Draft", "bg-muted text-muted-foreground ring-border"]
    : open
      ? ["Open", "bg-success/10 text-success ring-success/30"]
      : ["Closed", "bg-secondary text-secondary-foreground ring-border"];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}

export function JobList() {
  const jobs = useJobs();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: async (uuid: string) => {
      const result = await api.DELETE(
        "/api/v1/dashboard/content/jobs/{uuid}/",
        {
          params: { path: { uuid } },
        },
      );
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobsKey });
      toast.success("Job opening deleted");
    },
    onError: () => toast.error("Couldn't delete this job opening."),
  });

  return (
    <div className="flex flex-col gap-6">
      <ContentHeader
        description="Vacancies on the Careers page. People apply by email."
        action={
          <Button asChild size="xl">
            <Link href="/dashboard/content/careers/new">
              <PlusIcon data-icon="inline-start" />
              Add job opening
            </Link>
          </Button>
        }
      />
      {jobs.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
          <span className="sr-only">Loading…</span>
        </div>
      ) : jobs.isError ? (
        <p role="alert" className="text-destructive">
          Couldn&apos;t load job openings.
        </p>
      ) : jobs.data.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-10 text-center">
          <BriefcaseIcon
            className="text-muted-foreground size-10"
            aria-hidden
          />
          <p className="font-medium">No job openings yet.</p>
          <p className="text-muted-foreground max-w-md text-sm">
            While there are none, the Careers page invites people to send their
            CV to info@ for future openings.
          </p>
        </div>
      ) : (
        <ul
          className="bg-card divide-y rounded-2xl border"
          aria-label="Job openings"
        >
          {jobs.data.map((job) => (
            <li key={job.uuid} className="hover:bg-muted/60 flex items-center">
              <Link
                href={`/dashboard/content/careers/${job.uuid}`}
                className="flex min-w-0 flex-1 flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{job.title}</span>
                    <JobStatus
                      published={job.is_published}
                      open={job.is_open}
                    />
                  </div>
                  <p className="text-muted-foreground truncate text-sm">
                    {job.employment_type_label} · {job.location}
                  </p>
                </div>
                <p className="text-muted-foreground text-sm">
                  {job.closing_date
                    ? `Closes ${formatDate(job.closing_date)}`
                    : "No closing date"}
                </p>
              </Link>
              <div className="pr-2 sm:pr-3">
                <ConfirmDelete
                  icon
                  name={job.title}
                  title={`Delete “${job.title}”?`}
                  description="It is removed from the Careers page for good. This can't be undone."
                  onConfirm={() => remove.mutate(job.uuid)}
                  disabled={remove.isPending}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
