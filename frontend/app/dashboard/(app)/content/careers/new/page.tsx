import type { Metadata } from "next";

import { JobForm } from "@/components/dashboard/content/job-form";

export const metadata: Metadata = { title: "New job opening" };

export default function NewJobPage() {
  return <JobForm />;
}
