import { MailIcon, UserRoundIcon } from "lucide-react";

import { CloudImage } from "@/components/cloud-image";
import { safely, serverApi } from "@/lib/api/server";

/** "Our team" from the dashboard; renders nothing until there are members to show. */
export async function TeamSection() {
  const team = await safely(() => serverApi.GET("/api/v1/content/team/"));
  const members = team.data ?? [];
  if (members.length === 0) return null;

  return (
    <section
      id="team"
      aria-labelledby="team-heading"
      className="container-page scroll-mt-24 py-12 sm:py-16"
    >
      <h2 id="team-heading" className="mb-8 text-3xl font-bold">
        Our team
      </h2>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((m) => (
          <li
            key={m.uuid}
            className="bg-card flex flex-col overflow-hidden rounded-2xl border"
          >
            <div className="bg-muted relative aspect-square">
              {m.photo ? (
                <CloudImage
                  src={m.photo.public_id}
                  alt={m.name}
                  fill
                  crop="fill"
                  gravity="face"
                  sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <UserRoundIcon
                  className="text-muted-foreground absolute inset-0 m-auto size-16"
                  aria-hidden
                />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-5">
              <h3 className="text-lg font-semibold">{m.name}</h3>
              <p className="text-success text-sm font-medium">{m.role}</p>
              {m.bio && (
                <p className="text-muted-foreground mt-2 text-sm">{m.bio}</p>
              )}
              {(m.email || m.linkedin_url) && (
                <div className="mt-auto flex gap-3 pt-3 text-sm">
                  {m.email && (
                    <a
                      href={`mailto:${m.email}`}
                      className="text-primary inline-flex items-center gap-1 underline underline-offset-4"
                    >
                      <MailIcon className="size-4" aria-hidden />
                      Email<span className="sr-only"> {m.name}</span>
                    </a>
                  )}
                  {m.linkedin_url && (
                    <a
                      href={m.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      LinkedIn
                      <span className="sr-only"> profile of {m.name}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
