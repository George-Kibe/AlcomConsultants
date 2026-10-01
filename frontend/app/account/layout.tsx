import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s | Alcom Consultants" },
  robots: { index: false },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthCard>{children}</AuthCard>;
}
