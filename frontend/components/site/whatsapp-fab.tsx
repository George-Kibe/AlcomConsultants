import { WhatsAppIcon } from "@/components/icons";
import { whatsappLink } from "@/lib/site-config";

/** Floating WhatsApp button, always within thumb reach on mobile. */
export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink(
        "Hello Alcom Consultants, I'd like some help with a property.",
      )}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="bg-success text-success-foreground ring-background/60 focus-visible:ring-success/50 fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full shadow-lg ring-4 transition-transform outline-none hover:scale-105 motion-reduce:transition-none sm:right-6 sm:bottom-6 print:hidden"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
