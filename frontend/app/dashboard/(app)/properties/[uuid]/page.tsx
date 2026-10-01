"use client";

import { useParams } from "next/navigation";

import { PropertyForm } from "@/components/dashboard/properties/property-form";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { useDashboardProperty } from "@/lib/api/hooks";

export default function EditPropertyPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const property = useDashboardProperty(uuid);

  if (property.isPending)
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (property.isError) {
    const missing =
      property.error instanceof ApiError && property.error.status === 404;
    return (
      <p>
        {missing
          ? "This property doesn't exist (it may have been deleted)."
          : "Couldn't load this property."}
      </p>
    );
  }
  return (
    <PropertyForm key={property.data.updated_at} property={property.data} />
  );
}
