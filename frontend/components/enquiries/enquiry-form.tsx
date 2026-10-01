"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { WhatsAppIcon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useViewer } from "@/lib/api/visitor";
import { whatsappLink } from "@/lib/site-config";
import { cn } from "@/lib/utils";

import { Turnstile } from "./turnstile";

type Kind = components["schemas"]["EnquiryKindEnum"];
type Errors = Record<string, string[] | string | undefined>;
const first = (m: string[] | string | undefined) =>
  Array.isArray(m) ? m[0] : m;

export const PROPERTY_TYPES = [
  "House or villa",
  "Apartment",
  "Townhouse or maisonette",
  "Land",
  "Commercial (office, shop, warehouse)",
  "Mixed-use or block",
  "Other",
];

const formKey = ["enquiry-form"] as const;

function useFormConfig() {
  return useQuery({
    queryKey: formKey,
    queryFn: async () => unwrap(await api.GET("/api/v1/enquiries/form/")),
    staleTime: 10 * 60_000,
  });
}

function FormSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-11 w-40" />
      <span className="sr-only">Loading the form…</span>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * One enquiry form for every page: property, contact, valuation and management.
 * The office is emailed and the visitor gets a confirmation with a reference.
 */
export function EnquiryForm({
  kind,
  property,
  defaultMessage = "",
  submitLabel = "Send enquiry",
  compact = false,
}: {
  kind: Kind;
  property?: { slug: string; reference: string; title: string };
  defaultMessage?: string;
  submitLabel?: string;
  compact?: boolean;
}) {
  const id = useId();
  const f = (name: string) => `${id}-${name}`;
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const config = useFormConfig();
  const viewer = useViewer();
  const [errors, setErrors] = useState<Errors>({});
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [consent, setConsent] = useState(false);
  const [propertyType, setPropertyType] = useState("");
  const [purpose, setPurpose] = useState("");

  if (config.isPending || viewer.isPending) return <FormSkeleton />;
  if (config.isError) {
    return (
      <Alert>
        <AlertDescription>
          The form isn&apos;t available right now. Please{" "}
          <a
            className="underline"
            href={whatsappLink("Hello Alcom, I have an enquiry.")}
          >
            message us on WhatsApp
          </a>{" "}
          or call us instead.
        </AlertDescription>
      </Alert>
    );
  }

  if (sent !== null) {
    return (
      <div
        role="status"
        className="bg-success/10 flex flex-col gap-3 rounded-2xl p-5"
      >
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2Icon className="text-success size-5" aria-hidden />
          Thank you, we&apos;ve received your enquiry
        </p>
        <p className="text-sm">
          {sent && (
            <>
              Your reference is <strong>{sent}</strong>.{" "}
            </>
          )}
          A consultant will get back to you within one working day, and
          we&apos;ve sent a confirmation to your email.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="whatsapp" size="lg">
            <a
              href={whatsappLink(
                `Hello Alcom, following up on my enquiry ${sent ?? ""}`.trim(),
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon className="size-4" data-icon="inline-start" />
              WhatsApp us
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setSent(null)}
          >
            Send another
          </Button>
        </div>
      </div>
    );
  }

  const me = viewer.data;
  const siteKey = config.data.turnstile_site_key;
  const err = (name: string) => first(errors[name]);
  const describedBy = (name: string) =>
    err(name) ? `${f(name)}-error` : undefined;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    // onSubmit rather than a form action: React resets the form after an action,
    // which would wipe what the visitor typed whenever there's an error to fix.
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setProblem(undefined);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const units = text("units");
    const result = await api.POST("/api/v1/enquiries/", {
      body: {
        kind,
        name: text("name"),
        email: text("email"),
        phone: text("phone"),
        message: text("message"),
        property: property?.slug ?? null,
        property_type: propertyType,
        location: text("location"),
        purpose: (purpose || "") as never,
        units: units ? Number(units) : null,
        source_path: pathname,
        consent,
        form_token: config.data!.form_token,
        turnstile_token: turnstileToken,
        website: text("website"),
      },
    });
    setBusy(false);
    setAttempt((n) => n + 1); // Turnstile tokens are single-use
    if (result.data) {
      setSent(result.data.reference);
      void queryClient.invalidateQueries({ queryKey: formKey });
      return;
    }
    const body = (result.error ?? {}) as Errors;
    if (result.response.status === 429) {
      setProblem(
        "You've sent several enquiries in a short time. Please try again later, or call us.",
      );
    } else if (body.detail) {
      setProblem(first(body.detail));
      // A fresh token only helps when the old one expired (not when sent too fast).
      if (first(body.code) === "expired")
        void queryClient.invalidateQueries({ queryKey: formKey });
    } else if (Object.keys(body).length) {
      setErrors(body);
      setProblem("Please check the highlighted fields.");
    } else {
      setProblem("Couldn't send your enquiry. Please try again.");
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      className={cn("grid gap-4", !compact && "sm:grid-cols-2")}
    >
      {property && (
        <p className="bg-muted/70 rounded-lg px-3 py-2 text-sm sm:col-span-2">
          About <strong>{property.reference}</strong> · {property.title}
        </p>
      )}
      <Field id={f("name")} label="Your name" error={err("name")}>
        <Input
          id={f("name")}
          name="name"
          autoComplete="name"
          defaultValue={me?.full_name ?? ""}
          required
          aria-invalid={!!err("name")}
          aria-describedby={describedBy("name")}
          className="h-11"
        />
      </Field>
      <Field id={f("email")} label="Email" error={err("email")}>
        <Input
          id={f("email")}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={me?.email ?? ""}
          required
          aria-invalid={!!err("email")}
          aria-describedby={describedBy("email")}
          className="h-11"
        />
      </Field>
      <Field
        id={f("phone")}
        label="Phone (optional)"
        error={err("phone")}
        className={compact ? undefined : "sm:col-span-2"}
      >
        <Input
          id={f("phone")}
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={me?.phone ?? ""}
          aria-invalid={!!err("phone")}
          aria-describedby={describedBy("phone")}
          className="h-11"
        />
      </Field>

      {(kind === "valuation" || kind === "management") && (
        <>
          <Field id={f("type")} label="Type of property">
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger id={f("type")} className="h-11 w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            id={f("location")}
            label="Where is it?"
            error={err("location")}
            hint="Area and county, e.g. Kitengela, Kajiado"
          >
            <Input
              id={f("location")}
              name="location"
              required
              aria-invalid={!!err("location")}
              aria-describedby={
                describedBy("location") ?? `${f("location")}-hint`
              }
              className="h-11"
            />
          </Field>
        </>
      )}
      {kind === "valuation" && (
        <Field
          id={f("purpose")}
          label="What is the valuation for?"
          className="sm:col-span-2"
        >
          <Select value={purpose} onValueChange={setPurpose}>
            <SelectTrigger id={f("purpose")} className="h-11 w-full">
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              {config.data.purposes.map((p) => (
                <SelectItem key={String(p.value)} value={String(p.value)}>
                  {String(p.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      {kind === "management" && (
        <Field
          id={f("units")}
          label="Number of units (optional)"
          error={err("units")}
          className="sm:col-span-2"
        >
          <Input
            id={f("units")}
            name="units"
            type="number"
            min={1}
            inputMode="numeric"
            className="h-11 sm:max-w-40"
          />
        </Field>
      )}

      <Field
        id={f("message")}
        label={kind === "contact" ? "How can we help?" : "Message (optional)"}
        error={err("message")}
        className={compact ? undefined : "sm:col-span-2"}
      >
        <Textarea
          id={f("message")}
          name="message"
          rows={compact ? 3 : 5}
          maxLength={3000}
          defaultValue={defaultMessage}
          required={kind === "contact"}
          aria-invalid={!!err("message")}
          aria-describedby={describedBy("message")}
        />
      </Field>

      {/* Honeypot: hidden from people and assistive technology; bots fill it in. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={cn("flex flex-col gap-2", !compact && "sm:col-span-2")}>
        <div className="flex items-start gap-3">
          <Checkbox
            id={f("consent")}
            checked={consent}
            onCheckedChange={(c) => setConsent(c === true)}
            aria-invalid={!!err("consent")}
            aria-describedby={describedBy("consent")}
            className="mt-0.5"
          />
          <Label htmlFor={f("consent")} className="leading-snug font-normal">
            <span>
              {config.data.consent_text.replace(/ Privacy Policy\.$/, " ")}
              <Link href="/privacy" className="text-primary underline">
                Privacy Policy
              </Link>
              .
            </span>
          </Label>
        </div>
        {err("consent") && (
          <p
            id={`${f("consent")}-error`}
            className="text-destructive text-sm"
            role="alert"
          >
            {err("consent")}
          </p>
        )}
      </div>

      {siteKey && (
        <div className={compact ? undefined : "sm:col-span-2"}>
          <Turnstile
            siteKey={siteKey}
            onToken={setTurnstileToken}
            resetKey={attempt}
          />
        </div>
      )}

      {problem && (
        <Alert
          variant="destructive"
          role="alert"
          className={compact ? undefined : "sm:col-span-2"}
        >
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        size="xl"
        disabled={busy}
        className={cn("justify-self-start", compact && "w-full")}
      >
        {busy ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
