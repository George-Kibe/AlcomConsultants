import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Alcom Consultants collects, uses and protects your personal data under the Kenya Data Protection Act, 2019.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How Alcom Consultants collects, uses and protects your personal data under the Kenya Data Protection Act, 2019."
    />
  );
}
