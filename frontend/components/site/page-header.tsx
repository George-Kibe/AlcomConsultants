import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

type Crumb = { title: string; href?: string };

type PageHeaderProps = {
  title: string;
  intro?: string;
  breadcrumbs?: Crumb[];
};

export function PageHeader({
  title,
  intro,
  breadcrumbs = [],
}: PageHeaderProps) {
  const crumbs: Crumb[] = [
    { title: "Home", href: "/" },
    ...breadcrumbs,
    { title },
  ];

  return (
    <section className="bg-muted/60 border-b">
      <div className="container-page py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
            {crumbs.map((crumb, i) => (
              <li key={crumb.title} className="flex items-center gap-1">
                {i > 0 && <ChevronRightIcon className="size-3.5" aria-hidden />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-foreground rounded"
                  >
                    {crumb.title}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-foreground">
                    {crumb.title}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {intro && (
          <p className="text-muted-foreground mt-3 max-w-2xl text-lg">
            {intro}
          </p>
        )}
      </div>
    </section>
  );
}
