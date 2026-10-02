import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/site/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy Policy",
  description:
    "How Alcom Consultants collects, uses and protects your personal data under the Kenya Data Protection Act, 2019.",
};

const SECTIONS = [
  { id: "who-we-are", title: "Who we are" },
  { id: "what-we-collect", title: "Personal data we collect" },
  { id: "how-we-use", title: "How and why we use it" },
  { id: "sharing", title: "Who we share it with" },
  { id: "transfers", title: "Transfers outside Kenya" },
  { id: "retention", title: "How long we keep it" },
  { id: "security", title: "How we protect it" },
  { id: "your-rights", title: "Your rights" },
  { id: "marketing", title: "Marketing and alerts" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us and complaints" },
];

export default function PrivacyPolicyPage() {
  const { email, phone, address } = siteConfig.contact;
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How Alcom Consultants collects, uses and protects your personal data under the Kenya Data Protection Act, 2019."
      updated="2 October 2026"
      contents={SECTIONS}
    >
      <p>
        This policy explains what personal data we collect when you use
        alcomconsultants.co.ke or contact us, why we collect it, and the rights
        you have over it under the Data Protection Act, 2019 (the
        &ldquo;Act&rdquo;) and its regulations.
      </p>

      <LegalSection id="who-we-are" title="1. Who we are">
        <p>
          {siteConfig.name} (&ldquo;Alcom&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) is a firm of registered valuers, property managers
          and estate agents based in {address}. We are the{" "}
          <strong>data controller</strong> for the personal data described in
          this policy.
        </p>
        <p>
          For any question about your personal data, email{" "}
          <a href={`mailto:${email}`}>{email}</a> or call {phone}.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="2. Personal data we collect">
        <p>We collect only what we need, mostly directly from you:</p>
        <ul>
          <li>
            <strong>Enquiries:</strong> your name, email address, phone number,
            your message, the property or service you ask about (for example the
            location and type of property, the purpose of a valuation or the
            number of units to manage), and the date and time you agreed to be
            contacted.
          </li>
          <li>
            <strong>Your account</strong>, if you create one: your name, email
            address, phone number (optional), a securely hashed password (we
            never see the password itself), the properties you save, your saved
            searches and your email preferences. If you sign in with Google, we
            receive your name and email address from Google.
          </li>
          <li>
            <strong>Blog comments:</strong> the comment and the name shown with
            it (your first name and last initial).
          </li>
          <li>
            <strong>Job applications:</strong> the CV and information you choose
            to email us. The website itself does not store CVs.
          </li>
          <li>
            <strong>Property owners, landlords and tenants</strong> we work
            with: the details needed to market, value or manage a property, such
            as contact details, ownership documents and tenancy information.
          </li>
          <li>
            <strong>Technical data:</strong> your IP address, browser type and
            pages requested, which our servers record briefly for security and
            to keep the site working; and, only if you accept analytics cookies,
            how you use the site (see our{" "}
            <Link href="/cookies">Cookie Policy</Link>).
          </li>
        </ul>
        <p>
          We do not ask for sensitive personal data (such as health or religious
          information) through the website. Please don&apos;t include it in
          messages.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How and why we use it">
        <p>
          The Act requires a lawful basis for each use of your data. We rely on
          the following:
        </p>
        <ul>
          <li>
            <strong>To respond to your enquiry</strong> and arrange viewings,
            valuations or management services: with your{" "}
            <strong>consent</strong>, given on the enquiry form, and to take
            steps you ask for before entering into a <strong>contract</strong>.
          </li>
          <li>
            <strong>To provide your account</strong>, saved properties, saved
            searches and daily alerts: to perform our <strong>contract</strong>{" "}
            with you (these Terms).
          </li>
          <li>
            <strong>To carry out instructions</strong> (sales, lettings,
            valuations, property management): to perform our contract, and to
            comply with our <strong>legal obligations</strong>, including under
            the Estate Agents Act, the Valuers Act, tax law and anti-money
            laundering rules.
          </li>
          <li>
            <strong>To keep the website secure</strong>, prevent spam and fraud,
            and fix errors: our <strong>legitimate interests</strong> in running
            a safe, reliable service.
          </li>
          <li>
            <strong>To understand how the site is used</strong> (Google
            Analytics): only with your <strong>consent</strong>, through the
            cookie banner.
          </li>
          <li>
            <strong>To send news and offers</strong>: only with your{" "}
            <strong>consent</strong>, which you can withdraw at any time.
          </li>
        </ul>
        <p>
          We do not sell your personal data, and we do not make decisions about
          you based solely on automated processing.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="4. Who we share it with">
        <p>
          Only the people who need it see your data. Within Alcom, that means
          the staff handling your enquiry or instruction. We also use trusted
          service providers that process data on our behalf and under our
          instructions:
        </p>
        <ul>
          <li>
            <strong>Website hosting:</strong> our servers are hosted by a data
            centre provider in Germany. Our email server runs on the same
            infrastructure.
          </li>
          <li>
            <strong>Cloudflare</strong>: delivers the website quickly and
            protects it from attacks and, where enabled, checks enquiry forms
            for spam (Turnstile).
          </li>
          <li>
            <strong>Cloudinary</strong>: stores and delivers property and
            website photos.
          </li>
          <li>
            <strong>Google</strong>: Google sign-in (if you use it), and Google
            Analytics (only if you accept analytics cookies).
          </li>
          <li>
            <strong>Sentry</strong>: notifies us of technical errors. It is set
            up not to receive names, email addresses or other personal details.
          </li>
        </ul>
        <p>
          When you ask us to, or when it is part of a transaction, we share
          relevant details with the other parties involved, such as property
          owners, buyers, tenants, lenders, advocates or surveyors. We may also
          disclose data where the law requires it, for example to a court or a
          regulator.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="5. Transfers outside Kenya">
        <p>
          Some of the providers above store or process data outside Kenya (in
          the European Union, the United States and elsewhere). We only use
          providers that offer appropriate safeguards for personal data, such as
          data protection agreements and security certifications, as required by
          sections 48 to 50 of the Act.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. How long we keep it">
        <ul>
          <li>
            <strong>Enquiries</strong> that don&apos;t lead to an instruction:
            up to 2 years after our last contact with you.
          </li>
          <li>
            <strong>Client and transaction records:</strong> for as long as the
            instruction lasts and then for up to 7 years, to meet legal, tax and
            professional record-keeping requirements.
          </li>
          <li>
            <strong>Your account</strong>, saved properties and saved searches:
            until you delete your account (you can do this yourself under
            Profile and settings). Comments you posted stay on the blog, shown
            as &ldquo;Former reader&rdquo; and no longer linked to you.
          </li>
          <li>
            <strong>Job applications:</strong> up to 12 months, unless you ask
            us to delete them sooner.
          </li>
          <li>
            <strong>Server logs:</strong> a few weeks.
          </li>
          <li>
            <strong>Analytics data:</strong> up to 14 months.
          </li>
        </ul>
        <p>
          After these periods we delete or anonymise the data. Copies may remain
          in backups for a short time until the backups are replaced.
        </p>
      </LegalSection>

      <LegalSection id="security" title="7. How we protect it">
        <p>
          We use encrypted connections (HTTPS) throughout the site, hash all
          passwords, restrict staff access to those who need it, offer two-step
          verification for staff accounts, and keep our systems up to date. If a
          breach puts your data at risk, we will notify the Office of the Data
          Protection Commissioner and, where required, you, as the Act requires.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="8. Your rights">
        <p>Under the Act you have the right to:</p>
        <ul>
          <li>be informed about how your data is used (this policy);</li>
          <li>access the personal data we hold about you;</li>
          <li>have inaccurate or incomplete data corrected;</li>
          <li>have your data deleted, where we have no reason to keep it;</li>
          <li>object to, or ask us to restrict, how we use your data;</li>
          <li>
            receive your data in a portable format (account holders can download
            it under <strong>Profile and settings → Your data</strong>
            );
          </li>
          <li>withdraw consent at any time, without affecting earlier use.</li>
        </ul>
        <p>
          To use any of these rights, email{" "}
          <a href={`mailto:${email}`}>{email}</a>. We may ask you to confirm
          your identity, and we will reply within the time the Act allows.
        </p>
      </LegalSection>

      <LegalSection id="marketing" title="9. Marketing and alerts">
        <p>
          We only send news and offers if you opt in, and every saved-search
          alert has a link to stop it. You can change your choices at any time
          in your account, or by contacting us.
        </p>
      </LegalSection>

      <LegalSection id="children" title="10. Children">
        <p>
          Our website and services are meant for adults. We do not knowingly
          collect personal data from anyone under 18. If you believe a child has
          given us their data, please contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes to this policy">
        <p>
          We may update this policy from time to time. The date at the top shows
          when it last changed. If the changes are significant, we will tell
          account holders by email.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact us and complaints">
        <p>
          Contact us at <a href={`mailto:${email}`}>{email}</a>, on {phone}, or
          at our office in {address}.
        </p>
        <p>
          If you are unhappy with how we have handled your data, you can
          complain to the{" "}
          <a href="https://www.odpc.go.ke" target="_blank" rel="noopener">
            Office of the Data Protection Commissioner
          </a>
          . We would appreciate the chance to put things right first.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
