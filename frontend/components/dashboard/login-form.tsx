"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  authenticateTwoFactor,
  ensureCsrf,
  errorMessage,
  login,
  pendingFlow,
} from "@/lib/api/auth";
import { safeNext } from "@/lib/safe-redirect";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [step, setStep] = useState<"password" | "code">("password");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  useEffect(() => {
    void ensureCsrf();
  }, []);

  function done() {
    router.replace(next);
    router.refresh();
  }

  async function submitPassword(form: FormData) {
    setBusy(true);
    setError(undefined);
    const res = await login(
      String(form.get("email")),
      String(form.get("password")),
    );
    setBusy(false);
    if (res.status === 200) return done();
    if (res.status === 401 && pendingFlow(res, "mfa_authenticate"))
      return setStep("code");
    if (res.status === 409) return done(); // already signed in
    setError(
      res.status === 429
        ? "Too many attempts. Please wait a few minutes and try again."
        : (errorMessage(res) ?? "Incorrect email or password."),
    );
  }

  async function submitCode(value: string) {
    setBusy(true);
    setError(undefined);
    const res = await authenticateTwoFactor(value);
    setBusy(false);
    if (res.status === 200) return done();
    setCode("");
    setError(errorMessage(res) ?? "That code didn't work. Try the newest one.");
  }

  if (step === "code") {
    return (
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submitCode(code);
        }}
      >
        <div>
          <h1 className="text-xl font-bold">Two-step verification</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {useRecovery
              ? "Enter one of your recovery codes. Each code works once."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {useRecovery ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="recovery-code">Recovery code</Label>
            <Input
              id="recovery-code"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              autoComplete="off"
              autoFocus
              required
              className="h-11 font-mono"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Verification code</Label>
            <InputOTP
              id="code"
              maxLength={6}
              pattern="^[0-9]*$"
              inputMode="numeric"
              value={code}
              onChange={setCode}
              onComplete={(v) => void submitCode(v)}
              autoFocus
              autoComplete="one-time-code"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="size-11 text-base"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        )}
        <Button
          type="submit"
          size="xl"
          disabled={busy || (useRecovery ? code.length < 6 : code.length !== 6)}
        >
          {busy ? "Checking…" : "Verify"}
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setUseRecovery(!useRecovery);
            setCode("");
            setError(undefined);
          }}
        >
          {useRecovery
            ? "Use your authenticator app instead"
            : "Use a recovery code instead"}
        </Button>
      </form>
    );
  }

  return (
    <form action={submitPassword} className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Staff sign in</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Alcom Consultants dashboard
        </p>
      </div>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/dashboard/forgot-password"
            className="text-primary text-sm underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
        />
      </div>
      <Button type="submit" size="xl" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
