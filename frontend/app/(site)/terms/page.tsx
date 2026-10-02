import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/site/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: "Terms of Use",
  description:
    "The terms that apply when you use the Alcom Consultants website.",
};

const SECTIONS = [
  { id: "about", title: "About these terms" },
  { id: "using-the-site", title: "Using the website" },
  { id: "listings", title: "Property listings" },
  { id: "no-advice", title: "Information, not professional advice" },
  { id: "accounts", title: "Your account" },
  { id: "comments", title: "Comments and content you send us" },
  { id: "enquiries", title: "Enquiries and our services" },
  { id: "ip", title: "Our content and trademarks" },
  { id: "links", title: "Links and third-party services" },
  { id: "liability", title: "Our liability" },
  { id: "changes", title: "Changes and suspension" },
  { id: "law", title: "Governing law and disputes" },
  { id: "contact", title: "Contact us" },
];

export default function TermsOfUsePage() {
  const { email, phone } = siteConfig.contact;
  return (
    <LegalPage
      title="Terms of Use"
      intro="The terms that apply when you use the Alcom Consultants website."
      updated="2 October 2026"
      contents={SECTIONS}
    >
      <LegalSection id="about" title="1. About these terms">
        <p>
          This website, alcomconsultants.co.ke, is run by {siteConfig.name}{" "}
          (&ldquo;Alcom&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), a company
          registered in Kenya with its office in {siteConfig.contact.address}.
          By using the website you agree to these terms. If you don&apos;t
          agree, please don&apos;t use the website.
        </p>
        <p>
          How we handle personal data is explained in our{" "}
          <Link href="/privacy">Privacy Policy</Link>, and our use of cookies in
          our <Link href="/cookies">Cookie Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="using-the-site" title="2. Using the website">
        <p>You may use the website for lawful purposes only. You must not:</p>
        <ul>
          <li>
            copy, scrape or republish listings, photos or other content in bulk,
            or use automated tools to collect data from the site;
          </li>
          <li>
            try to gain unauthorised access to the website, our systems or other
            people&apos;s accounts, or interfere with how they work;
          </li>
          <li>
            send spam, false enquiries, or anything unlawful, defamatory,
            fraudulent or harmful through the website;
          </li>
          <li>pretend to be someone else or misrepresent who you act for.</li>
        </ul>
      </LegalSection>

      <LegalSection id="listings" title="3. Property listings">
        <p>
          Listings describe properties offered for sale, rent or lease. Most of
          the information comes from property owners and is published in good
          faith, but:
        </p>
        <ul>
          <li>
            a listing is an <strong>invitation to enquire</strong>, not an
            offer. No sale, lease or tenancy exists until a written agreement is
            signed by the parties;
          </li>
          <li>
            prices, sizes, features, photos and availability may change and may
            contain errors. Map locations are shown approximately unless stated
            otherwise;
          </li>
          <li>
            you should inspect the property and carry out your own checks,
            including an official land search and advice from an advocate,
            before you commit or pay any money;
          </li>
          <li>
            never pay a deposit or fee to anyone claiming to act for Alcom
            without first confirming with us on {phone} or at{" "}
            <a href={`mailto:${email}`}>{email}</a>. We will never ask you to
            pay into a personal account.
          </li>
        </ul>
      </LegalSection>

      <LegalSection
        id="no-advice"
        title="4. Information, not professional advice"
      >
        <p>
          Articles, guides, FAQs and other general content on the website are
          for information only. They are not valuation, legal, financial or
          investment advice, and you should not rely on them for a specific
          decision. A valuation can only be relied on when it is issued as a
          formal report by one of our Registered Valuers under a written
          instruction.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="5. Your account">
        <ul>
          <li>
            You must give accurate details, be at least 18, and keep your
            password secret. You are responsible for activity on your account.
          </li>
          <li>
            You can delete your account at any time under Profile and settings.
          </li>
          <li>
            We may suspend or close accounts that break these terms or are used
            to misuse the website.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="comments" title="6. Comments and content you send us">
        <p>
          When you post a comment or send us content, you confirm that it is
          your own, is accurate where it states facts, and does not break the
          law or anyone&apos;s rights. Comments must be relevant and respectful:
          no spam, advertising, abuse, hate speech or personal information about
          others.
        </p>
        <p>
          You keep ownership of what you write, but you allow us to display it
          on the website. We may hide or remove any comment, without notice, if
          we consider it breaks these terms.
        </p>
      </LegalSection>

      <LegalSection id="enquiries" title="7. Enquiries and our services">
        <p>
          Sending an enquiry does not create a contract or an agency
          relationship. Our services (agency, property management, valuations,
          asset management and land surveys) are provided under separate written
          terms of engagement, which will apply instead of these terms for those
          services.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="8. Our content and trademarks">
        <p>
          The website&apos;s design, text, logos and photos belong to Alcom or
          to those who licensed them to us, and are protected by copyright and
          trademark law. You may view and share pages for personal use (for
          example, sending a listing link to a family member), but you may not
          reproduce our content commercially without our written permission.
        </p>
      </LegalSection>

      <LegalSection id="links" title="9. Links and third-party services">
        <p>
          The website links to services we don&apos;t control, such as WhatsApp,
          Google Maps and OpenStreetMap, and to other websites. We are not
          responsible for their content or how they handle your data; their own
          terms and privacy policies apply.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="10. Our liability">
        <p>
          We work to keep the website accurate, secure and available, but we
          provide it &ldquo;as is&rdquo; and cannot promise it will always be
          error-free or uninterrupted.
        </p>
        <p>
          To the extent permitted by Kenyan law, we are not liable for any loss
          arising from your use of the website or reliance on its general
          content, including loss of profit, business or opportunity. Nothing in
          these terms limits liability that cannot be limited by law, including
          your rights as a consumer under the Consumer Protection Act, 2012.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes and suspension">
        <p>
          We may change the website or these terms at any time. The date at the
          top shows when the terms last changed; continuing to use the website
          after a change means you accept the updated terms. We may suspend the
          website, or parts of it, for maintenance or security.
        </p>
      </LegalSection>

      <LegalSection id="law" title="12. Governing law and disputes">
        <p>
          These terms are governed by the laws of Kenya. If a dispute arises,
          please contact us first so we can try to resolve it. Any dispute that
          cannot be resolved informally will be decided by the courts of Kenya.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact us">
        <p>
          Questions about these terms? Email{" "}
          <a href={`mailto:${email}`}>{email}</a> or call {phone}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
