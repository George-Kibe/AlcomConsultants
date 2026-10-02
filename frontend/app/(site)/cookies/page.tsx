import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  alternates: { canonical: "/cookies" },
  title: "Cookie Policy",
  description:
    "How and why this website uses cookies, and the choices you have.",
};

const ESSENTIAL = [
  [
    "sessionid",
    "Keeps you signed in to your account or the staff dashboard.",
    "1 week",
  ],
  ["csrftoken", "Protects forms against cross-site request forgery.", "1 year"],
  [
    "Theme and choices (local storage)",
    "Remembers light or dark mode, your cookie choice and what you were doing when asked to sign in.",
    "Until you clear them",
  ],
];
const ANALYTICS = [
  [
    "_ga",
    "Google Analytics: tells visits apart, so we can count visitors.",
    "2 years",
  ],
  [
    "_ga_<ID>",
    "Google Analytics: keeps track of the current visit.",
    "2 years",
  ],
];

function CookieTable({ rows }: { rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th scope="col" className="py-2 pr-4 font-semibold">
              Name
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Purpose
            </th>
            <th scope="col" className="py-2 font-semibold">
              Kept for
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, purpose, kept]) => (
            <tr key={name} className="border-b align-top">
              <td className="py-2 pr-4 font-mono text-xs">{name}</td>
              <td className="text-muted-foreground py-2 pr-4">{purpose}</td>
              <td className="text-muted-foreground py-2">{kept}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="How and why this website uses cookies, and the choices you have."
    >
      <div className="mt-8 flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Essential cookies</h2>
          <p className="text-muted-foreground">
            These make the website work and keep it secure. They don&apos;t need
            your consent and are never used for advertising.
          </p>
          <CookieTable rows={ESSENTIAL} />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">
            Analytics cookies (optional)
          </h2>
          <p className="text-muted-foreground">
            Only set if you choose &ldquo;Accept analytics&rdquo;. They help us
            understand which pages are useful. We don&apos;t use them for
            advertising, and you can change your choice at any time with
            &ldquo;Cookie settings&rdquo; at the bottom of every page.
          </p>
          <CookieTable rows={ANALYTICS} />
        </section>
      </div>
    </LegalPage>
  );
}
