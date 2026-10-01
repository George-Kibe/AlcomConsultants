import type { Metadata } from "next";

import { SecuritySettings } from "@/components/dashboard/security-settings";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return <SecuritySettings />;
}
