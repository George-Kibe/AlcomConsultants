"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheckIcon, DownloadIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Field, Section } from "@/components/dashboard/form-parts";
import { PasswordForm } from "@/components/dashboard/security-settings";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerification } from "@/lib/api/auth";
import { api } from "@/lib/api/client";
import {
  forgetViewer,
  useViewer,
  visitorKeys,
  type Viewer,
} from "@/lib/api/visitor";
import { formatDate } from "@/lib/format";

type Errors = Record<string, string[] | string | undefined>;
const first = (m: string[] | string | undefined) =>
  Array.isArray(m) ? m[0] : m;

function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Viewer>) => {
      const result = await api.PATCH("/api/v1/me/", { body });
      if (!result.data)
        throw Object.assign(new Error("save failed"), {
          fields: (result.error ?? {}) as Errors,
        });
      return result.data;
    },
    onSuccess: (me) => queryClient.setQueryData(visitorKeys.viewer, me),
  });
}

function DetailsForm({ me }: { me: Viewer }) {
  const id = useId();
  const save = useSaveProfile();
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  return (
    <Section
      title="Your details"
      description="Your first name and last initial appear with your blog comments."
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        action={(form) => {
          setErrors({});
          save.mutate(
            {
              first_name: String(form.get("first_name")),
              last_name: String(form.get("last_name")),
              phone: String(form.get("phone")),
            },
            {
              onSuccess: () => toast.success("Details saved"),
              onError: (e) => {
                setErrors((e as Error & { fields: Errors }).fields);
                toast.error("Please check the highlighted fields.");
              },
            },
          );
        }}
      >
        <Field
          label="First name"
          htmlFor={`${id}-first`}
          error={first(errors.first_name)}
        >
          <Input
            id={`${id}-first`}
            name="first_name"
            defaultValue={me.first_name}
            autoComplete="given-name"
            aria-invalid={!!errors.first_name}
            required
            className="h-11"
          />
        </Field>
        <Field
          label="Last name"
          htmlFor={`${id}-last`}
          error={first(errors.last_name)}
        >
          <Input
            id={`${id}-last`}
            name="last_name"
            defaultValue={me.last_name}
            autoComplete="family-name"
            className="h-11"
          />
        </Field>
        <Field
          label="Phone (optional)"
          htmlFor={`${id}-phone`}
          error={first(errors.phone)}
          hint="So we can call you back about properties you ask about."
        >
          <Input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            defaultValue={me.phone}
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            className="h-11"
          />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Email</span>
          <p className="flex min-h-11 flex-wrap items-center gap-2">
            <span className="break-all">{me.email}</span>
            {me.email_verified ? (
              <span className="text-success inline-flex items-center gap-1 text-sm">
                <BadgeCheckIcon className="size-4" aria-hidden />
                Confirmed
              </span>
            ) : (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                disabled={sent}
                onClick={async () => {
                  await resendVerification(me.email);
                  setSent(true);
                }}
              >
                {sent ? "Confirmation link sent" : "Confirm your email"}
              </Button>
            )}
          </p>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={save.isPending}
          className="justify-self-start sm:col-span-2"
        >
          {save.isPending ? "Saving…" : "Save details"}
        </Button>
      </form>
    </Section>
  );
}

function EmailPreferences({ me }: { me: Viewer }) {
  const id = useId();
  const save = useSaveProfile();
  return (
    <Section title="Emails from us">
      <div className="flex items-start gap-3">
        <Checkbox
          id={`${id}-news`}
          checked={!!me.marketing_opt_in}
          disabled={save.isPending}
          className="mt-0.5"
          onCheckedChange={(checked) =>
            save.mutate(
              { marketing_opt_in: checked === true },
              {
                onSuccess: (next) =>
                  toast.success(
                    next.marketing_opt_in
                      ? "You'll receive news and offers"
                      : "You won't receive news and offers",
                  ),
                onError: () => toast.error("Couldn't save your choice."),
              },
            )
          }
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-news`}>
            Send me occasional news and offers by email
          </Label>
          <p className="text-muted-foreground text-sm">
            New developments, market updates and offers, at most twice a month.
            {me.marketing_opt_in && me.marketing_opt_in_at
              ? ` You agreed on ${formatDate(me.marketing_opt_in_at)}.`
              : ""}{" "}
            Saved-search alerts are managed on the Saved searches tab.
          </p>
        </div>
      </div>
    </Section>
  );
}

function DeleteAccount({ me }: { me: Viewer }) {
  const id = useId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const field = me.has_password ? "password" : "confirm";

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const result = await api.POST("/api/v1/me/delete/", {
      body: { [field]: value },
    });
    setBusy(false);
    if (!result.response.ok) {
      const body = (result.error ?? {}) as Errors;
      return setError(
        first(body[field]) ??
          first(body.detail) ??
          "Couldn't delete your account. Please try again.",
      );
    }
    forgetViewer(queryClient);
    toast.success("Your account has been deleted.");
    router.replace("/");
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="lg" className="self-start">
          <Trash2Icon data-icon="inline-start" />
          Delete my account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={remove} className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile, saved properties and saved searches are deleted
              straight away. Your blog comments stay, shown as &ldquo;Former
              reader&rdquo;. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-confirm`}>
              {me.has_password
                ? "Enter your password to confirm"
                : "Type DELETE to confirm"}
            </Label>
            <Input
              id={`${id}-confirm`}
              type={me.has_password ? "password" : "text"}
              autoComplete={me.has_password ? "current-password" : "off"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              required
              className="h-11"
            />
            {error && (
              <p
                id={`${id}-error`}
                className="text-destructive text-sm"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Keep my account</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={busy || !value}
            >
              {busy ? "Deleting…" : "Delete account"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProfileSettings() {
  const me = useViewer().data;
  if (!me) return null;
  return (
    <div className="grid max-w-3xl gap-6">
      <DetailsForm me={me} />
      <EmailPreferences me={me} />
      <Section title="Password">
        {me.has_password ? (
          <PasswordForm />
        ) : (
          <p className="text-muted-foreground text-sm">
            You sign in with Google, so there&apos;s no password to change.
          </p>
        )}
      </Section>
      <Section
        title="Your data"
        description={`Member since ${formatDate(me.date_joined)}.`}
      >
        <p className="text-muted-foreground text-sm">
          Download a copy of everything we hold about your account: profile,
          saved properties and searches, comments and email choices.
        </p>
        <Button asChild variant="outline" size="lg" className="self-start">
          <a href="/api/v1/me/export/" download>
            <DownloadIcon data-icon="inline-start" />
            Download my data
          </a>
        </Button>
        <hr />
        {me.is_staff ? (
          <p className="text-muted-foreground text-sm">
            Staff accounts are closed by an administrator.
          </p>
        ) : (
          <DeleteAccount me={me} />
        )}
      </Section>
    </div>
  );
}
