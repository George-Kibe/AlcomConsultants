import { WhatsAppIcon } from "@/components/icons";
import { AccountMenu } from "@/components/site/account-menu";
import { Logo } from "@/components/site/logo";
import { MobileNav } from "@/components/site/mobile-nav";
import { NavLinks } from "@/components/site/nav-links";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import { mainNav, whatsappLink } from "@/lib/site-config";

export function Header() {
  return (
    <header className="bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-40 border-b backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <NavLinks
            items={mainNav}
            className="flex items-center gap-1"
            linkClassName="px-3 py-2"
          />
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <AccountMenu />
          <Button
            asChild
            variant="whatsapp"
            size="lg"
            className="hidden lg:inline-flex"
          >
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon />
              WhatsApp us
            </a>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
