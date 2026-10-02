import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { safely, serverApi } from "@/lib/api/server";

export type FaqItem = { uuid: string; question: string; answer: string };

/** FAQs from the dashboard (optionally of some categories, e.g. "valuation,general"). */
export async function loadFaqs(category?: string): Promise<FaqItem[]> {
  const result = await safely(() =>
    serverApi.GET("/api/v1/content/faqs/", {
      params: { query: category ? { category } : {} },
    }),
  );
  return result.data ?? [];
}

export function FaqList({ faqs }: { faqs: FaqItem[] }) {
  return (
    <Accordion
      type="single"
      collapsible
      className="bg-card rounded-2xl border px-5"
    >
      {faqs.map((faq) => (
        <AccordionItem key={faq.uuid} value={faq.uuid}>
          <AccordionTrigger className="py-4 text-base">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-base whitespace-pre-line">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
