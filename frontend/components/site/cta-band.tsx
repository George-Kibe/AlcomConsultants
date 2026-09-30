import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { WhatsAppIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/site-config";

type CtaBandProps = {
  title?: string;
  text?: string;
};

export function CtaBand({
  title = "Selling, letting or valuing a property?",
  text = "Tell us about it and one of our consultants will get back to you.",
}: CtaBandProps) {
  return (
    <section className="container-page py-12 sm:py-16">
      <div className="bg-brand-navy dark:bg-card relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-12 sm:py-14">
        <div
          aria-hidden
          className="bg-brand-green/25 absolute -top-24 -right-24 size-72 rounded-full blur-3xl"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
            <p className="mt-2 text-white/80">{text}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="xl"
              className="text-brand-navy bg-white hover:bg-white/90"
            >
              <Link href="/contact">
                Contact us
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="whatsapp">
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-5" data-icon="inline-start" />
                WhatsApp us
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
