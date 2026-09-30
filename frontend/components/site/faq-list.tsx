import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/lib/faqs";

export function FaqList() {
  return (
    <Accordion
      type="single"
      collapsible
      className="bg-card rounded-2xl border px-5"
    >
      {faqs.map((faq, i) => (
        <AccordionItem key={faq.question} value={`faq-${i}`}>
          <AccordionTrigger className="py-4 text-base">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-base">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
