import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms that apply when you use the Alcom Consultants website.",
};

export default function TermsofUsePage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="The terms that apply when you use the Alcom Consultants website."
    />
  );
}
