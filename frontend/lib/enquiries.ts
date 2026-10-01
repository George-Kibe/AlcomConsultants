import type { components } from "@/lib/api/schema";

export type Stage = components["schemas"]["EnquiryStageEnum"];
export type EnquiryKind = components["schemas"]["EnquiryKindEnum"];
export type EnquiryListItem = components["schemas"]["EnquiryList"];
export type EnquiryDetail = components["schemas"]["EnquiryDetail"];

/** Pipeline order. */
export const STAGES: { value: Stage; label: string; open: boolean }[] = [
  { value: "new", label: "New", open: true },
  { value: "contacted", label: "Contacted", open: true },
  { value: "viewing", label: "Viewing", open: true },
  { value: "negotiating", label: "Negotiating", open: true },
  { value: "won", label: "Won", open: false },
  { value: "lost", label: "Lost", open: false },
];

export const KINDS: { value: EnquiryKind; label: string }[] = [
  { value: "listing", label: "Property enquiry" },
  { value: "contact", label: "General enquiry" },
  { value: "valuation", label: "Valuation request" },
  { value: "management", label: "Property management" },
];

export const stageLabel = (stage: string) =>
  STAGES.find((s) => s.value === stage)?.label ?? stage;
export const kindLabel = (kind: string) =>
  KINDS.find((k) => k.value === kind)?.label ?? kind;

/** "+254 712 345 678" / "0712 345 678" → "254712345678" for wa.me links. */
export function whatsappNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return null;
}
