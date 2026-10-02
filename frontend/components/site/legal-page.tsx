import { PageHeader } from "@/components/site/page-header";

type LegalPageProps = {
  title: string;
  intro: string;
  /** e.g. "2 October 2026" */
  updated: string;
  /** Section ids and headings, for the contents list. */
  contents?: { id: string; title: string }[];
  children?: React.ReactNode;
};

/** Privacy Policy, Terms of Use and Cookie Policy. */
export function LegalPage({
  title,
  intro,
  updated,
  contents = [],
  children,
}: LegalPageProps) {
  return (
    <>
      <PageHeader title={title} intro={intro} />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {contents.length > 0 && (
          <nav
            aria-label="Contents"
            className="lg:sticky lg:top-24 lg:self-start"
          >
            {/* Collapsed on phones so the policy starts on the first screen. */}
            <details className="group bg-muted/60 rounded-xl p-4 lg:hidden">
              <summary className="cursor-pointer text-sm font-semibold">
                Contents
              </summary>
              <ContentsList contents={contents} className="mt-3" />
            </details>
            <div className="hidden lg:block">
              <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
                Contents
              </h2>
              <ContentsList contents={contents} />
            </div>
          </nav>
        )}
        <article className="rich-text max-w-3xl">
          <p className="text-muted-foreground text-sm">
            Last updated: {updated}
          </p>
          {children}
        </article>
      </div>
    </>
  );
}

function ContentsList({
  contents,
  className = "",
}: {
  contents: { id: string; title: string }[];
  className?: string;
}) {
  return (
    <ol
      className={`text-muted-foreground flex flex-col gap-2 text-sm ${className}`}
    >
      {contents.map((c, i) => (
        <li key={c.id}>
          <a
            href={`#${c.id}`}
            className="hover:text-foreground underline-offset-4 hover:underline"
          >
            {i + 1}. {c.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** A numbered section with an anchor for the contents list. */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 [&>*+*]:mt-4">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
