"use client";

import { useParams } from "next/navigation";

import { JobForm } from "@/components/dashboard/content/job-form";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { useJob } from "@/lib/api/content";

export default function EditJobPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const job = useJob(uuid);
  if (job.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (job.isError) {
    const missing = job.error instanceof ApiError && job.error.status === 404;
    return (
      <p role="alert">
        {missing ? "This job opening doesn't exist." : "Couldn't load it."}
      </p>
    );
  }
  return <JobForm key={job.data.updated_at} job={job.data} />;
}
