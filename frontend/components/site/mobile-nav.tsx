"use client";

import { MenuIcon, PhoneIcon } from "lucide-react";
import { useState } from "react";

import { WhatsAppIcon } from "@/components/icons";
import { Logo } from "@/components/site/logo";
import { NavLinks } from "@/components/site/nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mainNav, siteConfig, telLink, whatsappLink } from "@/lib/site-config";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="md:hidden"
          aria-label="Open menu"
        >
          <MenuIcon className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85%] max-w-sm gap-0">
        <SheetHeader className="border-b">
          <SheetTitle asChild>
            <div>
              <Logo />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-4">
          <NavLinks
            items={mainNav}
            onNavigate={() => setOpen(false)}
            className="flex flex-col gap-1"
            linkClassName="flex min-h-12 items-center px-3 text-lg hover:bg-muted aria-[current=page]:bg-secondary"
          />
        </nav>
        <div className="flex flex-col gap-3 border-t p-4">
          <Button asChild size="xl" variant="whatsapp">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-5" />
              Chat on WhatsApp
            </a>
          </Button>
          <Button asChild size="xl" variant="outline">
            <a href={telLink()}>
              <PhoneIcon />
              {siteConfig.contact.phone}
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
