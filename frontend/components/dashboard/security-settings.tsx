"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AuthResponse,
  activateTotp,
  changePassword,
  deactivateTotp,
  errorMessage,
  getRecoveryCodes,
  getTotp,
  needsReauthentication,
  reauthenticate,
  regenerateRecoveryCodes,
} from "@/lib/api/auth";
import { queryKeys } from "@/lib/api/hooks";

type Action = () => Promise<AuthResponse>;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Asks for the password when allauth requires recent authentication, then retries. */
function useReauth() {
  const [pending, setPending] = useState<{
    action: Action;
    resolve: (r: AuthResponse) => void;
  }>();

  function run(action: Action): Promise<AuthResponse> {
    return action().then((res) =>
      needsReauthentication(res)
        ? new Promise<AuthResponse>((resolve) =>
            setPending({ action, resolve }),
          )
        : res,
    );
  }

  function Prompt() {
    const [error, setError] = useState<string>();
    if (!pending) return null;
    return (
      <form
        className="bg-muted flex flex-col gap-3 rounded-xl p-4"
        action={async (form) => {
          const res = await reauthenticate(String(form.get("password")));
          if (res.status !== 200)
            return setError(errorMessage(res) ?? "Incorrect password.");
          const retried = await pending.action();
          pending.resolve(retried);
          setPending(undefined);
        }}
      >
        <Label htmlFor="reauth-password">
          Confirm your password to continue
        </Label>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex gap-2">
          <Input
            id="reauth-password"
            name="password"
            type="password"
            required
            autoFocus
          />
          <Button type="submit">Confirm</Button>
        </div>
      </form>
    );
  }

  return { run, Prompt };
}

function PasswordForm() {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="flex max-w-md flex-col gap-4"
      action={async (form) => {
        const next = String(form.get("new_password"));
        if (next !== form.get("confirm"))
          return setError("The new passwords don't match.");
        setBusy(true);
        setError(undefined);
        const res = await changePassword(
          String(form.get("current_password")),
          next,
        );
        setBusy(false);
        if (res.status !== 200)
          return setError(errorMessage(res) ?? "Couldn't change password.");
        toast.success("Password changed");
        (
          document.getElementById("password-form") as HTMLFormElement | null
        )?.reset();
      }}
      id="password-form"
    >
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {[
        ["current_password", "Current password", "current-password"],
        [
          "new_password",
          "New password (at least 10 characters)",
          "new-password",
        ],
        ["confirm", "Confirm new password", "new-password"],
      ].map(([name, label, autoComplete]) => (
        <div key={name} className="flex flex-col gap-2">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            name={name}
            type="password"
            autoComplete={autoComplete}
            required
          />
        </div>
      ))}
      <Button type="submit" disabled={busy} className="self-start" size="lg">
        {busy ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}

function RecoveryCodes({ initial }: { initial?: string[] }) {
  const [codes, setCodes] = useState<string[] | undefined>(initial);
  const [count, setCount] = useState<number>();

  async function show() {
    const res = await getRecoveryCodes();
    setCodes(res.data?.unused_codes);
    setCount(res.data?.unused_code_count);
  }

  async function regenerate() {
    const res = await regenerateRecoveryCodes();
    if (res.status === 200) {
      setCodes(res.data?.unused_codes);
      toast.success("New recovery codes generated. Old codes no longer work.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Recovery codes let you sign in if you lose your phone. Each works once —
        keep them somewhere safe, like a password manager.
      </p>
      {codes ? (
        <>
          <ul className="bg-muted grid grid-cols-2 gap-2 rounded-xl p-4 font-mono text-sm sm:grid-cols-4">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          {count !== undefined && (
            <p className="text-muted-foreground text-xs">
              {count} unused codes left.
            </p>
          )}
          <Button
            variant="outline"
            className="self-start"
            onClick={() => void regenerate()}
          >
            Generate new codes
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => void show()}
        >
          Show recovery codes
        </Button>
      )}
    </div>
  );
}

function TwoFactor() {
  const queryClient = useQueryClient();
  const reauth = useReauth();
  const totp = useQuery({ queryKey: ["totp"], queryFn: getTotp });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [newCodes, setNewCodes] = useState<string[]>();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["totp"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.me });
  };

  if (totp.isPending) return <Skeleton className="h-24 w-full" />;

  const enabled = totp.data?.status === 200;
  const secret = totp.data?.meta?.secret;
  const totpUrl = totp.data?.meta?.totp_url;

  if (enabled) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2">
          <Badge className="bg-success text-success-foreground">On</Badge>
          Sign-in asks for a code from your authenticator app.
        </p>
        <RecoveryCodes initial={newCodes} />
        <reauth.Prompt />
        <Button
          variant="destructive"
          className="self-start"
          onClick={async () => {
            const res = await reauth.run(deactivateTotp);
            if (res.status === 200) {
              toast.success("Two-step verification turned off");
              setNewCodes(undefined);
              refresh();
            }
          }}
        >
          Turn off two-step verification
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2">
        <Badge variant="outline">Off</Badge>
        Add a code from your phone to every sign-in for extra protection.
      </p>
      {totpUrl && secret && (
        <ol className="flex list-decimal flex-col gap-4 pl-5">
          <li>
            Scan this with an authenticator app (Google Authenticator, Microsoft
            Authenticator, 1Password…).
            <div className="mt-3 w-fit rounded-xl bg-white p-3">
              <QRCodeSVG
                value={totpUrl}
                size={176}
                aria-label="Two-step verification QR code"
              />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Can&apos;t scan? Enter this key:{" "}
              <code className="break-all">{secret}</code>
            </p>
          </li>
          <li>
            <form
              className="flex flex-col gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(undefined);
                const res = await reauth.run(() => activateTotp(code));
                if (res.status !== 200) {
                  return setError(
                    errorMessage(res, "code") ??
                      errorMessage(res) ??
                      "Wrong code.",
                  );
                }
                const codes = await getRecoveryCodes();
                setNewCodes(codes.data?.unused_codes);
                toast.success("Two-step verification is on");
                refresh();
              }}
            >
              <Label htmlFor="totp-code">Enter the 6-digit code it shows</Label>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <div className="flex max-w-xs gap-2">
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
                <Button type="submit" disabled={code.length !== 6}>
                  Turn on
                </Button>
              </div>
            </form>
          </li>
        </ol>
      )}
      <reauth.Prompt />
    </div>
  );
}

export function SecuritySettings() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Security</h1>
        <p className="text-muted-foreground mt-1">
          Your password and two-step verification.
        </p>
      </div>
      <Section title="Two-step verification">
        <TwoFactor />
      </Section>
      <Section title="Password">
        <PasswordForm />
      </Section>
    </div>
  );
}
