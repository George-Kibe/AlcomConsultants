import type { Metadata } from "next";

import { DashboardProviders } from "@/components/dashboard/providers";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Alcom Dashboard" },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return <DashboardProviders>{children}</DashboardProviders>;
}
