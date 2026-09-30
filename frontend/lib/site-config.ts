/**
 * Company details and navigation used across the site.
 * Moves to the backend SiteSettings model (editable in the dashboard) in a later phase.
 *
 * TODO(content): replace placeholder contact details with Alcom's real ones before launch.
 */
export const siteConfig = {
  name: "Alcom Consultants Limited",
  shortName: "Alcom Consultants",
  description:
    "Property sales, rentals, property management and valuations across Kenya.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8080",
  contact: {
    phone: "+254 700 000 000", // placeholder
    whatsapp: "254700000000", // placeholder — international format, digits only
    email: "info@alcomconsultants.co.ke",
    address: "Nairobi, Kenya", // placeholder
    hours: "Mon – Fri: 8:00am – 5:00pm · Sat: 9:00am – 1:00pm", // placeholder
  },
  social: {
    facebook: "", // placeholder — empty links are hidden
    instagram: "",
    linkedin: "",
    x: "",
  },
} as const;

export type NavItem = { title: string; href: string };

export const mainNav: NavItem[] = [
  { title: "Home", href: "/" },
  { title: "Properties", href: "/properties" },
  { title: "Services", href: "/services" },
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
];

export const legalNav: NavItem[] = [
  { title: "Privacy Policy", href: "/privacy" },
  { title: "Terms of Use", href: "/terms" },
  { title: "Cookie Policy", href: "/cookies" },
];

export type Service = {
  slug: "property-agency" | "property-management" | "property-valuations";
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  cta: { label: string; href: string };
};

export const services: Service[] = [
  {
    slug: "property-agency",
    title: "Property Agency",
    summary:
      "Buy, sell, rent or lease residential, commercial and land property across Kenya.",
    description:
      "Whether you are looking for a home, an investment or space for your business, our agents guide you from the first viewing to the signed agreement. Property owners get professional marketing, qualified enquiries and hands-on support through negotiation.",
    highlights: [
      "Houses, apartments, land and commercial property",
      "Sales, long-term rentals and commercial leases",
      "Off-plan and development projects",
      "Guidance from viewing to agreement",
    ],
    cta: { label: "Browse properties", href: "/properties" },
  },
  {
    slug: "property-management",
    title: "Property Management",
    summary:
      "Hands-off ownership: tenant sourcing, rent collection, maintenance and reporting.",
    description:
      "We look after your property as if it were our own. From finding and vetting tenants to collecting rent, coordinating maintenance and keeping you informed, we protect your investment and your time.",
    highlights: [
      "Tenant sourcing and vetting",
      "Rent collection and arrears follow-up",
      "Maintenance and repairs coordination",
      "Regular statements for landlords",
    ],
    cta: { label: "Talk to us about your property", href: "/contact" },
  },
  {
    slug: "property-valuations",
    title: "Property Valuations",
    summary:
      "Independent valuations for mortgages, sales, insurance and statutory purposes.",
    description:
      "Our valuation reports give banks, buyers, sellers and institutions a clear, defensible view of a property's value, prepared with care and delivered on time.",
    highlights: [
      "Mortgage and bank valuations",
      "Sale and purchase valuations",
      "Insurance (reinstatement) valuations",
      "Probate, capital gains, rating and court valuations",
    ],
    cta: { label: "Request a valuation", href: "/contact" },
  },
];

export function whatsappLink(message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${siteConfig.contact.whatsapp}${text}`;
}

export function telLink(phone: string = siteConfig.contact.phone) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
