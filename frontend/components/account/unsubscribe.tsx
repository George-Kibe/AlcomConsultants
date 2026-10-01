"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";

/** From the link in a saved-search email; a button (not the link itself) switches
 * alerts off, so mail scanners that open links don't unsubscribe anyone. */
export function Unsubscribe({ token }: { token: string }) {
  const [done, setDone] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function stop() {
    setBusy(true);
    const result = await api.POST("/api/v1/alerts/unsubscribe/", {
      body: { token },
    });
    setBusy(false);
    if (result.data) setDone(result.data.email);
    else
      setError(
        "This link didn't work. Sign in to manage your saved searches instead.",
      );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">Emails stopped</h1>
        <p className="text-muted-foreground text-sm">
          <strong className="text-foreground break-all">{done}</strong> will no
          longer receive saved-search emails. Your saved searches are kept, and
          you can switch alerts back on at any time.
        </p>
        <Button asChild size="xl">
          <Link href="/account/saved-searches">Manage saved searches</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Stop saved-search emails?</h1>
      <p className="text-muted-foreground text-sm">
        You&apos;ll stop receiving the daily email about new properties that
        match your saved searches.
      </p>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button size="xl" onClick={() => void stop()} disabled={busy || !token}>
        {busy ? "Stopping…" : "Stop the emails"}
      </Button>
      <Button asChild variant="link">
        <Link href="/account/saved-searches">
          Manage saved searches instead
        </Link>
      </Button>
    </div>
  );
}
