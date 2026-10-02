/**
 * Company details and navigation used across the site.
 * Moves to the backend SiteSettings model (editable in the dashboard) in a later phase.
 */
export const siteConfig = {
  name: "Alcom Consultants Limited",
  shortName: "Alcom Consultants",
  tagline: "Registered Valuers • Property Managers • Estate Agents",
  description:
    "Houses, apartments, land and commercial property for sale and rent in Nairobi and across Kenya. Registered valuers, property managers and estate agents in Westlands, Nairobi.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8080",
  contact: {
    phone: "+254 181 943550",
    altPhone: "+254 716 014 087",
    whatsapp: "254181943550", // all WhatsApp chats; international format, digits only
    email: "info@alcomconsultants.co.ke",
    address: "Westlands, Nairobi, Kenya",
    hours: "Mon – Fri: 8:00am – 5:00pm · Sat: 9:00am – 1:00pm",
  },
  social: {
    // Empty links are hidden; add the URLs once the accounts exist.
    facebook: "",
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
  { title: "Blog", href: "/blog" },
  { title: "Contact", href: "/contact" },
];

export const legalNav: NavItem[] = [
  { title: "Privacy Policy", href: "/privacy" },
  { title: "Terms of Use", href: "/terms" },
  { title: "Cookie Policy", href: "/cookies" },
];

export type Service = {
  slug:
    | "property-agency"
    | "property-management"
    | "property-valuations"
    | "asset-management"
    | "land-survey";
  title: string;
  /** Short strapline shown on the service page. */
  tagline?: string;
  /** FAQ categories shown on the service page (dashboard → Site content → FAQs). */
  faqCategories: string;
  summary: string;
  description: string;
  highlights: string[];
  cta: { label: string; href: string };
  /** The enquiry form at the bottom of the service page (#enquire). */
  enquiry: {
    kind: "contact" | "valuation" | "management" | "assets" | "survey";
    title: string;
    intro: string;
  };
};

export const services: Service[] = [
  {
    slug: "property-agency",
    faqCategories: "buying,selling",
    title: "Estate Agency",
    summary:
      "Sale, purchase and letting of residential, commercial and industrial property across Kenya.",
    description:
      "We act as your intermediary in the sale, purchase and letting of property, backed by in-depth market knowledge and a wide client network. Our licensed estate agents market your property professionally, source and qualify buyers and tenants, and negotiate on your behalf through to completion.",
    highlights: [
      "Marketing and sale of residential, commercial and industrial property",
      "Letting and tenant sourcing",
      "Property market research and advisory",
      "Negotiation and closing of sale and lease transactions",
    ],
    cta: { label: "Browse properties", href: "/properties" },
    enquiry: {
      kind: "contact",
      title: "Selling or letting a property?",
      intro:
        "Tell us about the property and what you'd like to achieve. A consultant will call you back.",
    },
  },
  {
    slug: "property-management",
    faqCategories: "management",
    title: "Property Management",
    summary:
      "Property and facilities management for residential, commercial and mixed-use developments.",
    description:
      "We provide comprehensive property and facilities management for commercial, residential and mixed-use developments, protecting your asset and securing optimal returns for owners and investors.",
    highlights: [
      "Rent collection and tenant management",
      "Lease administration and renewals",
      "Service charge budgeting and management",
      "Facilities and maintenance management",
      "Property inspections and condition reporting",
      "Statutory compliance (NEMA, county rates, fire certificates and more)",
    ],
    cta: { label: "Talk to us about your property", href: "#enquire" },
    enquiry: {
      kind: "management",
      title: "Talk to us about your property",
      intro:
        "Tell us about the property and we'll get back to you with how we would manage it and what it costs.",
    },
  },
  {
    slug: "property-valuations",
    faqCategories: "valuation",
    title: "Valuation Services",
    summary:
      "Professional valuations by Registered Valuers for lending, sale, insurance, reporting and more.",
    description:
      "Our valuations are carried out by Registered Valuers in accordance with the Valuers Act and International Valuation Standards (IVS), giving banks, buyers, sellers, insurers and institutions a clear, defensible opinion of value.",
    highlights: [
      "Secured lending and mortgage valuations",
      "Sale and purchase (fair market value)",
      "Insurance (reinstatement cost assessment)",
      "Financial reporting and asset registers",
      "Compulsory acquisition and compensation",
      "Plant and machinery",
      "Probate, estate distribution and litigation support",
    ],
    cta: { label: "Request a valuation", href: "#enquire" },
    enquiry: {
      kind: "valuation",
      title: "Request a valuation",
      intro:
        "Tell us what you need valued and why. We'll reply with our fee and the earliest inspection date.",
    },
  },
  {
    slug: "asset-management",
    faqCategories: "assets",
    title: "Asset Tagging, Register Creation & Asset Management",
    tagline: "Identify • Tag • Value • Register • Manage",
    summary:
      "Comprehensive asset management solutions for land, buildings and movable assets, aligned with National Treasury Guidelines.",
    description:
      "We help organisations know exactly what they own, where it is and what it is worth. Our team identifies and verifies land, buildings and movable assets, tags each one, values it, and builds a complete asset register aligned with National Treasury Guidelines, so you have a reliable basis for financial reporting, audits, insurance and planning.",
    highlights: [
      "Identification and physical verification of land, buildings and movable assets",
      "Asset tagging with unique identification tags",
      "Valuation of assets for financial reporting",
      "Fixed asset register creation and updating",
      "Asset management in line with National Treasury Guidelines",
      "Periodic asset verification and reconciliation",
    ],
    cta: { label: "Talk to us about your assets", href: "#enquire" },
    enquiry: {
      kind: "assets",
      title: "Talk to us about your assets",
      intro:
        "Tell us about your organisation and the assets to tag, value or register. We'll get back to you with a proposal.",
    },
  },
  {
    slug: "land-survey",
    faqCategories: "survey",
    title: "Land Survey Services",
    tagline: "Accurate. Reliable. Professional.",
    summary:
      "Comprehensive land surveying solutions including boundary surveys, subdivision, amalgamation, beacon reinstatement, topographical surveys, mutation surveys and land verification.",
    description:
      "Accurate surveys protect your investment and keep transactions moving. We carry out boundary, topographical and mutation surveys, subdivide and amalgamate parcels, reinstate missing beacons, and verify land on the ground and against the records, so you know exactly what you own or are buying.",
    highlights: [
      "Boundary surveys",
      "Subdivision and amalgamation",
      "Beacon reinstatement",
      "Topographical surveys",
      "Mutation surveys",
      "Land verification",
    ],
    cta: { label: "Request a survey", href: "#enquire" },
    enquiry: {
      kind: "survey",
      title: "Request a land survey",
      intro:
        "Tell us where the land is and what you need surveyed. We'll reply with our fee and the earliest date we can be on site.",
    },
  },
];

/** The kinds of clients we serve (About and home pages). */
export const clientTypes = [
  { label: "Corporate & Private Companies", icon: "corporate" },
  { label: "Government Institutions & Parastatals", icon: "government" },
  { label: "Schools, Universities & Tertiary Institutions", icon: "education" },
  { label: "Property Owners & Developers", icon: "developers" },
  { label: "Banks & Financial Institutions", icon: "banks" },
  { label: "Individual Property Owners & Investors", icon: "individuals" },
  { label: "Law Firms & Legal Practitioners", icon: "legal" },
  { label: "Contractors & Construction Companies", icon: "construction" },
  { label: "Residential & Commercial Property Owners", icon: "owners" },
  { label: "NGOs & Non-Profit Organisations", icon: "ngos" },
] as const;

/** Complementary services offered alongside the core service lines. */
export const alliedServices = [
  "Real estate investment advisory and feasibility studies",
  "Project management and development consultancy",
  "Due diligence for property transactions",
  "Land economics and market research",
  "Corporate real estate portfolio advisory",
];

export function whatsappLink(message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${siteConfig.contact.whatsapp}${text}`;
}

export function telLink(phone: string = siteConfig.contact.phone) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
