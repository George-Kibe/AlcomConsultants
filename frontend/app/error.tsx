"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-bold sm:text-3xl">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md">
        Sorry, we couldn&apos;t load this page. Please try again.
      </p>
      <Button size="xl" onClick={() => retry()}>
        Try again
      </Button>
    </section>
  );
}
