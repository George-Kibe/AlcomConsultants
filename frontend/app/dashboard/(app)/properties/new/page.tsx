import type { Metadata } from "next";

import { PropertyForm } from "@/components/dashboard/properties/property-form";

export const metadata: Metadata = { title: "Add a property" };

export default function NewPropertyPage() {
  return <PropertyForm />;
}
