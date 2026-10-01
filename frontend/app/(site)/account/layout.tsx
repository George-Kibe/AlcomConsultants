import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s | Alcom Consultants" },
  robots: { index: false },
};

export default function MemberLayout({ children }: LayoutProps<"/account">) {
  return <AccountShell>{children}</AccountShell>;
}
