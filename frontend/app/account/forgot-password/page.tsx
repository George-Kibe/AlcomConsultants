"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureCsrf, requestPasswordReset } from "@/lib/api/auth";
import { submitWith } from "@/lib/forms";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureCsrf();
  }, []);

  async function submit(form: FormData) {
    setBusy(true);
    await requestPasswordReset(String(form.get("email")));
    setBusy(false);
    setSent(true); // same message whether or not the account exists
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Reset your password</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          We&apos;ll email you a link to choose a new password.
        </p>
      </div>
      {sent ? (
        <Alert>
          <AlertDescription>
            If that email belongs to a staff account, a reset link is on its
            way. Check your inbox and spam folder.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={submitWith(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="h-11"
            />
          </div>
          <Button type="submit" size="xl" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <Link
        href="/account/sign-in"
        className="text-primary text-center text-sm underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
