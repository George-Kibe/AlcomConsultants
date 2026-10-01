"use client";

import { useParams } from "next/navigation";

import {
  EnquiryDetailSkeleton,
  EnquiryDetailView,
} from "@/components/dashboard/enquiries/enquiry-detail";
import { ApiError } from "@/lib/api/client";
import { useDashboardEnquiry } from "@/lib/api/hooks";

export default function EnquiryPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const enquiry = useDashboardEnquiry(uuid);

  if (enquiry.isPending) return <EnquiryDetailSkeleton />;
  if (enquiry.isError) {
    const missing =
      enquiry.error instanceof ApiError && enquiry.error.status === 404;
    return (
      <p role="alert">
        {missing
          ? "This enquiry doesn't exist (it may have been deleted)."
          : "Couldn't load this enquiry."}
      </p>
    );
  }
  return <EnquiryDetailView enquiry={enquiry.data} />;
}
