import Link from "next/link";

import { SiteShell } from "@/components/site/site-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-primary text-6xl font-bold">404</p>
        <h1 className="text-2xl font-bold sm:text-3xl">
          We couldn&apos;t find that page
        </h1>
        <p className="text-muted-foreground max-w-md">
          The page may have moved, or the property may no longer be available.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="xl">
            <Link href="/">Go to homepage</Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="/properties">Browse properties</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
