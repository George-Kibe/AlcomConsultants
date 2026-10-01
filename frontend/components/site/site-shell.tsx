import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { SiteProviders } from "@/components/site/providers";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";

/** Public-site chrome: skip link, header, footer and the WhatsApp button. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <SiteProviders>
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-lg px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
      <WhatsAppFab />
    </SiteProviders>
  );
}
