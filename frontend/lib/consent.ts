/**
 * The visitor's cookie choice (kept in this browser). Analytics (GA4) loads only after
 * the visitor accepts; essential cookies (sign-in, security) need no consent.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

export type Consent = { analytics: boolean; at: string };

const KEY = "alcom:cookie-consent";
export const CONSENT_EVENT = "alcom:consent-change";
export const OPEN_SETTINGS_EVENT = "alcom:open-cookie-settings";

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean) {
  const consent: Consent = { analytics, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(consent));
  } catch {
    /* storage blocked: the choice lasts for this page view */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }));
  if (!analytics) clearAnalyticsCookies();
}

/** Remove Google Analytics cookies after a visitor withdraws consent. */
function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.replace(/^www\./, "")}`];
  for (const name of document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())) {
    if (!name.startsWith("_ga")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
