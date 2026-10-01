"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { RETURN_KEY } from "@/components/auth/sign-up-form";
import { Button } from "@/components/ui/button";
import { decodeKey, ensureCsrf, verifyEmail } from "@/lib/api/auth";
import { safeLocalPath } from "@/lib/safe-redirect";

function returnPath() {
  try {
    return safeLocalPath(localStorage.getItem(RETURN_KEY), "/blog");
  } catch {
    return "/blog";
  }
}

export default function VerifyEmailPage() {
  const { key } = useParams<{ key: string }>();
  const [state, setState] = useState<"checking" | "done" | "failed">(
    "checking",
  );
  const [back, setBack] = useState("/blog");

  // Keys are single-use, so verify exactly once (effects run twice in development).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      await ensureCsrf();
      const res = await verifyEmail(decodeKey(key));
      // 401 = verified, but this browser isn't signed in to that account.
      setState(res.status === 200 || res.status === 401 ? "done" : "failed");
      setBack(returnPath());
    })();
  }, [key]);

  if (state === "checking")
    return (
      <p role="status" className="text-muted-foreground">
        Confirming your email…
      </p>
    );

  return state === "done" ? (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Email confirmed</h1>
      <p className="text-muted-foreground text-sm">
        Thanks! You can now comment on our articles.
      </p>
      <Button asChild size="xl">
        <Link href={back}>Continue</Link>
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">This link didn&apos;t work</h1>
      <p className="text-muted-foreground text-sm">
        It may have expired or already been used. Sign in and request a new
        confirmation email from any article&apos;s comments.
      </p>
      <Button asChild size="xl">
        <Link href="/account/sign-in">Sign in</Link>
      </Button>
    </div>
  );
}
