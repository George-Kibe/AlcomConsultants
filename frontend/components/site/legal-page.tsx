import { PageHeader } from "@/components/site/page-header";

type LegalPageProps = {
  title: string;
  intro: string;
  children?: React.ReactNode;
};

/** Draft legal pages. Final text is written with Alcom's lawyer before launch (Phase 6). */
export function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <>
      <PageHeader title={title} intro={intro} />
      <section className="container-page max-w-3xl py-12">
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          This page is being finalised. For any questions about how we handle
          your information, please contact us.
        </p>
        {children}
      </section>
    </>
  );
}
