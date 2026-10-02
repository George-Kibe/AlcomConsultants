import type { Metadata } from "next";
import {
  BriefcaseIcon,
  CalendarIcon,
  MailIcon,
  MapPinIcon,
} from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { safely, serverApi } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { jsonLd } from "@/lib/json-ld";
import { siteConfig } from "@/lib/site-config";

const EMPLOYMENT: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
};

const loadJob = cache(async (slug: string) => {
  const result = await safely(() =>
    serverApi.GET("/api/v1/careers/{slug}/", { params: { path: { slug } } }),
  );
  if (result.status === 404) notFound();
  if (!result.data) throw new Error("Job temporarily unavailable");
  return result.data;
});

export async function generateMetadata({
  params,
}: PageProps<"/careers/[slug]">): Promise<Metadata> {
  const job = await loadJob((await params).slug);
  return {
    title: `${job.title} (careers)`,
    description: job.summary,
    alternates: { canonical: `/careers/${job.slug}` },
  };
}

export default async function JobPage({
  params,
}: PageProps<"/careers/[slug]">) {
  const job = await loadJob((await params).slug);
  const subject = encodeURIComponent(`Application: ${job.title}`);
  const structured = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.summary,
    datePosted: job.published_at,
    ...(job.closing_date && {
      validThrough: `${job.closing_date}T23:59:59+03:00`,
    }),
    employmentType: EMPLOYMENT[job.employment_type ?? "full_time"],
    hiringOrganization: {
      "@type": "Organization",
      name: siteConfig.name,
      sameAs: siteConfig.url,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "KE",
      },
    },
  };

  return (
    <>
      {job.is_open && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(structured) }}
        />
      )}
      <PageHeader
        title={job.title}
        intro={job.summary}
        breadcrumbs={[{ title: "Careers", href: "/careers" }]}
      />
      <section className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {job.description ? (
            <div
              className="rich-text"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          ) : (
            <p className="text-muted-foreground">{job.summary}</p>
          )}
        </div>
        <aside className="lg:self-start" aria-label="How to apply">
          <div className="bg-card flex flex-col gap-4 rounded-2xl border p-6">
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2">
                <BriefcaseIcon className="size-4" aria-hidden />
                {job.employment_type_label}
              </li>
              <li className="flex items-center gap-2">
                <MapPinIcon className="size-4" aria-hidden />
                {job.location}
              </li>
              {job.closing_date && (
                <li className="flex items-center gap-2">
                  <CalendarIcon className="size-4" aria-hidden />
                  {job.is_open ? "Apply by" : "Closed on"}{" "}
                  {formatDate(job.closing_date)}
                </li>
              )}
            </ul>
            {job.is_open ? (
              <>
                <h2 className="text-lg font-semibold">How to apply</h2>
                <p className="text-sm">
                  Email your CV and a short cover letter to{" "}
                  <strong className="break-all">{job.apply_email}</strong> with
                  the subject &ldquo;Application: {job.title}&rdquo;.
                </p>
                <Button asChild size="xl">
                  <a href={`mailto:${job.apply_email}?subject=${subject}`}>
                    <MailIcon data-icon="inline-start" />
                    Apply by email
                  </a>
                </Button>
              </>
            ) : (
              <p className="bg-muted rounded-lg p-3 text-sm" role="status">
                This position has closed. See our other openings on the careers
                page.
              </p>
            )}
          </div>
        </aside>
      </section>
    </>
  );
}
