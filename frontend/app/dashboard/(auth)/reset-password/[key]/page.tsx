"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureCsrf, errorMessage, resetPassword } from "@/lib/api/auth";

export default function ResetPasswordPage() {
  const { key } = useParams<{ key: string }>();
  const [state, setState] = useState<"form" | "done">("form");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureCsrf();
  }, []);

  async function submit(form: FormData) {
    const password = String(form.get("password"));
    if (password !== form.get("confirm"))
      return setError("The passwords don't match.");
    setBusy(true);
    setError(undefined);
    const res = await resetPassword(key, password);
    setBusy(false);
    // 401 = reset succeeded but the user must still sign in.
    if (res.status === 200 || res.status === 401) return setState("done");
    setError(errorMessage(res) ?? "This reset link is invalid or has expired.");
  }

  if (state === "done") {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-bold">Password updated</h1>
        <Button asChild size="xl">
          <Link href="/dashboard/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Choose a new password</h1>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          className="h-11"
        />
        <p className="text-muted-foreground text-xs">At least 10 characters.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className="h-11"
        />
      </div>
      <Button type="submit" size="xl" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
