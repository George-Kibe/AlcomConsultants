import type { Metadata } from "next";

import { FaqManager } from "@/components/dashboard/content/faq-manager";

export const metadata: Metadata = { title: "FAQs" };

export default function Page() {
  return <FaqManager />;
}
