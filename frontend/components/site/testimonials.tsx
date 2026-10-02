import { QuoteIcon, StarIcon } from "lucide-react";

import { safely, serverApi } from "@/lib/api/server";

/** Client testimonials from the dashboard (up to `limit`); nothing until there are some. */
export async function Testimonials({ limit = 6 }: { limit?: number }) {
  const result = await safely(() =>
    serverApi.GET("/api/v1/content/testimonials/"),
  );
  const items = (result.data ?? []).slice(0, limit);
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="bg-muted/60 py-16 sm:py-20"
    >
      <div className="container-page">
        <h2
          id="testimonials-heading"
          className="mb-8 text-3xl font-bold sm:text-4xl"
        >
          What our clients say
        </h2>
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <li key={t.uuid}>
              <figure className="bg-card flex h-full flex-col gap-4 rounded-2xl border p-6">
                <QuoteIcon className="text-success size-7" aria-hidden />
                {t.rating ? (
                  <p
                    className="flex gap-0.5"
                    aria-label={`${t.rating} out of 5 stars`}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarIcon
                        key={i}
                        aria-hidden
                        className={
                          i < (t.rating ?? 0)
                            ? "size-4 fill-amber-400 text-amber-500"
                            : "text-muted-foreground/40 size-4"
                        }
                      />
                    ))}
                  </p>
                ) : null}
                <blockquote className="flex-1 text-base leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption>
                  <span className="font-semibold">{t.name}</span>
                  {t.role && (
                    <span className="text-muted-foreground block text-sm">
                      {t.role}
                    </span>
                  )}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
