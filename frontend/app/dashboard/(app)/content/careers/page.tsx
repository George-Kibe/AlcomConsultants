import type { Metadata } from "next";

import { JobList } from "@/components/dashboard/content/job-list";

export const metadata: Metadata = { title: "Careers" };

export default function CareersPage() {
  return <JobList />;
}
