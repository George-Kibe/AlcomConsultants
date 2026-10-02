import type { Metadata } from "next";
import Link from "next/link";

import { CookieSettingsLink } from "@/components/site/cookie-consent";
import { LegalPage, LegalSection } from "@/components/site/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  alternates: { canonical: "/cookies" },
  title: "Cookie Policy",
  description:
    "How and why this website uses cookies, and the choices you have.",
};

const SECTIONS = [
  { id: "what-are-cookies", title: "What cookies are" },
  { id: "essential", title: "Essential cookies" },
  { id: "analytics", title: "Analytics cookies (optional)" },
  { id: "your-choices", title: "Your choices" },
  { id: "changes", title: "Changes and contact" },
];

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
    <div className="not-prose overflow-x-auto">
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
  const { email } = siteConfig.contact;
  return (
    <LegalPage
      title="Cookie Policy"
      intro="How and why this website uses cookies, and the choices you have."
      updated="2 October 2026"
      contents={SECTIONS}
    >
      <LegalSection id="what-are-cookies" title="1. What cookies are">
        <p>
          Cookies are small text files a website stores in your browser. We also
          use your browser&apos;s local storage, which works in a similar way.
          This policy covers both. It should be read with our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="essential" title="2. Essential cookies">
        <p>
          These make the website work and keep it secure, for example keeping
          you signed in and protecting forms. They don&apos;t need your consent,
          are set only by us, and are never used for advertising.
        </p>
        <CookieTable rows={ESSENTIAL} />
      </LegalSection>

      <LegalSection id="analytics" title="3. Analytics cookies (optional)">
        <p>
          With your permission we use Google Analytics to understand how
          visitors use the website, such as which pages are useful and where
          people leave, so we can improve it. These cookies are set only if you
          choose &ldquo;Accept analytics&rdquo;. Google processes this
          information on our behalf; advertising features are switched off.
        </p>
        <CookieTable rows={ANALYTICS} />
      </LegalSection>

      <LegalSection id="your-choices" title="4. Your choices">
        <p>
          When you first visit, a banner asks whether you accept analytics
          cookies. You can change your choice at any time with &ldquo;Cookie
          settings&rdquo; at the bottom of every page. If you withdraw consent,
          we delete the analytics cookies from your browser.
        </p>
        <p>
          <CookieSettingsLink className="text-primary font-medium underline underline-offset-4" />
        </p>
        <p>
          You can also block or delete cookies in your browser settings.
          Blocking essential cookies will stop parts of the website, such as
          signing in, from working.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="5. Changes and contact">
        <p>
          If we start using other cookies, we will update this policy and, if
          they need consent, ask you first. Questions? Email{" "}
          <a href={`mailto:${email}`}>{email}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
