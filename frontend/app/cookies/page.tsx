import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How and why this website uses cookies, and the choices you have.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="How and why this website uses cookies, and the choices you have."
    />
  );
}
