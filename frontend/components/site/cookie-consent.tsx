"use client";

import { CookieIcon } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CONSENT_EVENT,
  GA_ID,
  OPEN_SETTINGS_EVENT,
  readConsent,
  saveConsent,
  type Consent,
} from "@/lib/consent";

/**
 * Cookie banner and Google Analytics (GA4). Nothing from Google loads until the visitor
 * accepts; without a GA4 ID configured there is nothing to consent to and no banner.
 */
export function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;
    const stored = readConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once on mount
    setConsent(stored);
    setOpen(stored === null);
    const onChange = (e: Event) =>
      setConsent((e as CustomEvent<Consent>).detail);
    const onOpen = () => setOpen(true);
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
    };
  }, []);

  // Withdrawn after GA had loaded: tell gtag to stop storing anything.
  useEffect(() => {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (consent && !consent.analytics && w.gtag) {
      w.gtag("consent", "update", { analytics_storage: "denied" });
    }
  }, [consent]);

  if (!GA_ID) return null;

  const choose = (analytics: boolean) => {
    saveConsent(analytics);
    setOpen(false);
  };

  return (
    <>
      {consent?.analytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      {open && (
        <section
          role="dialog"
          aria-labelledby="cookie-title"
          aria-describedby="cookie-text"
          className="bg-card fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border p-5 shadow-xl sm:flex-row sm:items-center sm:p-6"
        >
          <CookieIcon
            className="text-success hidden size-8 shrink-0 sm:block"
            aria-hidden
          />
          <div className="flex-1">
            <h2 id="cookie-title" className="font-semibold">
              Cookies on this website
            </h2>
            <p id="cookie-text" className="text-muted-foreground mt-1 text-sm">
              We use essential cookies to make the site work. With your
              permission we&apos;d also like to use Google Analytics to see how
              the site is used, so we can improve it. See our{" "}
              <Link href="/cookies" className="text-primary underline">
                Cookie Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => choose(false)}>
              Essential only
            </Button>
            <Button onClick={() => choose(true)}>Accept analytics</Button>
          </div>
        </section>
      )}
    </>
  );
}

/** Footer link that reopens the cookie choice (only when analytics is configured). */
export function CookieSettingsLink({ className }: { className?: string }) {
  if (!GA_ID) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
    >
      Cookie settings
    </button>
  );
}
