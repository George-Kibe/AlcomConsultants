import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";

import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/icons";
import { Logo } from "@/components/site/logo";
import { Skyline } from "@/components/site/skyline";
import {
  legalNav,
  mainNav,
  services,
  siteConfig,
  telLink,
  whatsappLink,
} from "@/lib/site-config";

const socials = [
  { label: "Facebook", href: siteConfig.social.facebook, Icon: FacebookIcon },
  {
    label: "Instagram",
    href: siteConfig.social.instagram,
    Icon: InstagramIcon,
  },
  { label: "LinkedIn", href: siteConfig.social.linkedin, Icon: LinkedInIcon },
  { label: "X", href: siteConfig.social.x, Icon: XIcon },
].filter((s) => s.href);

const linkClass =
  "rounded text-inverse-muted transition-colors hover:text-inverse-foreground focus-visible:text-inverse-foreground";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="text-inverse-foreground mt-auto print:hidden">
      <Skyline className="text-inverse" />
      <div className="bg-inverse">
        <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-4">
            <Logo onDark className="self-start" />
            <p className="text-inverse-muted max-w-sm text-sm leading-relaxed">
              {siteConfig.name} helps clients across Kenya buy, sell, rent,
              manage and value property with integrity and professionalism.
            </p>
            {socials.length > 0 && (
              <ul className="flex gap-2">
                {socials.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="bg-inverse-foreground/10 text-inverse-foreground hover:bg-inverse-foreground/20 flex size-10 items-center justify-center rounded-full transition-colors"
                    >
                      <Icon className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav aria-labelledby="footer-quick-links" className="lg:col-span-2">
            <h2
              id="footer-quick-links"
              className="mb-4 text-base font-semibold"
            >
              Quick links
            </h2>
            <ul className="flex flex-col gap-3 text-sm">
              {[...mainNav, { title: "Careers", href: "/careers" }].map(
                (item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={linkClass}>
                      {item.title}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <nav aria-labelledby="footer-services" className="lg:col-span-3">
            <h2 id="footer-services" className="mb-4 text-base font-semibold">
              Services
            </h2>
            <ul className="flex flex-col gap-3 text-sm">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className={linkClass}
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="mb-4 text-base font-semibold">Contact us</h2>
            <address className="flex flex-col gap-3 text-sm not-italic">
              <p className="text-inverse-muted flex gap-3">
                <MapPinIcon
                  className="text-brand-green mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                {siteConfig.contact.address}
              </p>
              <a href={telLink()} className={`flex gap-3 ${linkClass}`}>
                <PhoneIcon
                  className="text-brand-green mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                {siteConfig.contact.phone} / {siteConfig.contact.altPhone}
              </a>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex gap-3 ${linkClass}`}
              >
                <WhatsAppIcon className="text-brand-green mt-0.5 size-4 shrink-0" />
                WhatsApp
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className={`flex gap-3 ${linkClass}`}
              >
                <MailIcon
                  className="text-brand-green mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                {siteConfig.contact.email}
              </a>
            </address>
          </div>
        </div>

        <div className="border-inverse-foreground/10 border-t">
          <div className="container-page text-inverse-muted flex flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} {siteConfig.name}. All rights reserved.
              <span className="block sm:mt-1">
                Developed by{" "}
                <a
                  href="https://www.realhiveconsultants.com/"
                  target="_blank"
                  rel="noopener"
                  className={`font-medium underline underline-offset-4 ${linkClass}`}
                >
                  Realhive Consultants
                </a>
              </span>
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {legalNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
