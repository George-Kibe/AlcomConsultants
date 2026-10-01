"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/google-button";
import {
  authenticateTwoFactor,
  ensureCsrf,
  errorMessage,
  login,
  pendingFlow,
} from "@/lib/api/auth";
import { api } from "@/lib/api/client";
import { safeLocalPath, safeNext } from "@/lib/safe-redirect";

const noopSubscribe = () => () => {};

/**
 * Email + password sign-in with the two-step verification step. "staff" is the dashboard
 * login; "reader" (visitor accounts) adds Google and a link to create an account.
 */
export function LoginForm({
  variant = "staff",
}: {
  variant?: "staff" | "reader";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const reader = variant === "reader";
  const requested = params.get("next");
  const next = reader ? safeLocalPath(requested, "") : safeNext(requested);
  const [step, setStep] = useState<"password" | "code">("password");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  // Until React has hydrated, a click would submit the form natively and lose the
  // sign-in; keep the button disabled until the page is interactive.
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  useEffect(() => {
    void ensureCsrf();
  }, []);

  async function done() {
    let target = next;
    if (!target) {
      // Reader page without ?next=: staff go to the dashboard, everyone else to their account.
      const me = await api.GET("/api/v1/me/");
      target = me.data?.is_staff ? "/dashboard" : "/account";
    }
    router.replace(target);
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
    if (res.status === 200) return void done();
    if (res.status === 401 && pendingFlow(res, "mfa_authenticate"))
      return setStep("code");
    if (res.status === 409) return void done(); // already signed in
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
    if (res.status === 200) return void done();
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
        <h1 className="text-xl font-bold">
          {reader ? "Sign in" : "Staff sign in"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {reader
            ? "Your saved properties, searches and comments."
            : "Alcom Consultants dashboard"}
        </p>
      </div>
      {reader && params.get("error") && !error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {params.get("error") === "exists"
              ? "An account with this email already exists. Sign in with your password."
              : "Google sign-in didn't complete. Please try again."}
          </AlertDescription>
        </Alert>
      )}
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
            href="/account/forgot-password"
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
      <Button type="submit" size="xl" disabled={busy || !ready}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      {reader && (
        <>
          <GoogleButton next={next || "/account"} />
          <p className="text-muted-foreground text-center text-sm">
            New here?{" "}
            <Link
              href={`/account/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </>
      )}
    </form>
  );
}
