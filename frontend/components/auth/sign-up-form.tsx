"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ensureCsrf,
  errorMessage,
  resendVerification,
  signup,
} from "@/lib/api/auth";
import { safeLocalPath } from "@/lib/safe-redirect";

import { GoogleButton } from "./google-button";
import { submitWith } from "@/lib/forms";

const noopSubscribe = () => () => {};
/** Where to send the reader once their email is confirmed (read by the verify page). */
export const RETURN_KEY = "alcom:after-verify";

export function SignUpForm() {
  const next = safeLocalPath(useSearchParams().get("next"), "/account");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string>();
  const [resent, setResent] = useState(false);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    void ensureCsrf();
  }, []);

  async function submit(form: FormData) {
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (password !== form.get("confirm"))
      return setError("The passwords don't match.");
    setBusy(true);
    setError(undefined);
    const res = await signup(String(form.get("name")), email, password);
    setBusy(false);
    if (res.status === 200 || res.status === 401) {
      try {
        localStorage.setItem(RETURN_KEY, next);
      } catch {
        // Storage unavailable (private mode): the verify page falls back to /account.
      }
      return setSentTo(email);
    }
    setError(
      res.status === 429
        ? "Too many attempts. Please wait a few minutes and try again."
        : (errorMessage(res) ?? "Couldn't create your account."),
    );
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="text-muted-foreground text-sm">
          We sent a confirmation link to <strong>{sentTo}</strong>. Open it to
          finish setting up your account. You&apos;re already signed in.
        </p>
        <Button asChild size="xl">
          <Link href={next}>Continue</Link>
        </Button>
        <Button
          type="button"
          variant="link"
          disabled={resent}
          onClick={async () => {
            await resendVerification(sentTo);
            setResent(true);
          }}
        >
          {resent ? "Sent again" : "Didn't get it? Send it again"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submitWith(submit)} className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Create an account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Save properties, get a daily email about new matches for your
          searches, and comment on our articles.
        </p>
      </div>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          autoFocus
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          aria-describedby="password-hint"
          className="h-11"
        />
        <p id="password-hint" className="text-muted-foreground text-xs">
          At least 10 characters.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className="h-11"
        />
      </div>
      <Button type="submit" size="xl" disabled={busy || !ready}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
      <GoogleButton next={next} />
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          href={`/account/sign-in?next=${encodeURIComponent(next)}`}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
      <p className="text-muted-foreground text-center text-xs">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
