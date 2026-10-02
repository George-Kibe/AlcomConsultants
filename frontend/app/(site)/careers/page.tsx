import type { Metadata } from "next";
import { BriefcaseIcon, CalendarIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/site/page-header";
import { safely, serverApi } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Work with Alcom Consultants: open positions in property valuation, management and estate agency in Nairobi.",
  alternates: { canonical: "/careers" },
};

export default async function CareersPage() {
  await connection(); // openings come from the dashboard
  const result = await safely(() => serverApi.GET("/api/v1/careers/"));
  const jobs = result.data ?? [];

  return (
    <>
      <PageHeader
        title="Careers"
        intro="Join a team of registered valuers, property managers and estate agents helping clients across Kenya."
      />
      <section className="container-page py-12 sm:py-16">
        {jobs.length === 0 ? (
          <div className="bg-card flex max-w-2xl flex-col gap-3 rounded-2xl border p-8">
            <h2 className="text-xl font-semibold">
              No open positions right now
            </h2>
            <p className="text-muted-foreground">
              We&apos;re always happy to hear from talented people. Send your CV
              to{" "}
              <a
                href={`mailto:${siteConfig.contact.email}?subject=${encodeURIComponent("Speculative application")}`}
                className="text-primary underline underline-offset-4"
              >
                {siteConfig.contact.email}
              </a>{" "}
              and we&apos;ll keep it on file for future openings.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4" aria-label="Open positions">
            {jobs.map((job) => (
              <li key={job.slug}>
                <Link
                  href={`/careers/${job.slug}`}
                  className="bg-card hover:border-primary/40 flex flex-col gap-2 rounded-2xl border p-6 transition-colors"
                >
                  <h2 className="text-xl font-semibold">{job.title}</h2>
                  <p className="text-muted-foreground">{job.summary}</p>
                  <p className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <BriefcaseIcon className="size-4" aria-hidden />
                      {job.employment_type_label}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPinIcon className="size-4" aria-hidden />
                      {job.location}
                    </span>
                    {job.closing_date && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarIcon className="size-4" aria-hidden />
                        Apply by {formatDate(job.closing_date)}
                      </span>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
