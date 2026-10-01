import type { Metadata } from "next";
import { Suspense } from "react";

import { PropertyList } from "@/components/dashboard/properties/property-list";

export const metadata: Metadata = { title: "Properties" };

export default function PropertiesPage() {
  return (
    <Suspense>
      <PropertyList />
    </Suspense>
  );
}
