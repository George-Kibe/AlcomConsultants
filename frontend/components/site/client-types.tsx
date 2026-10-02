import {
  BanknoteIcon,
  Building2Icon,
  GavelIcon,
  GraduationCapIcon,
  HandHeartIcon,
  HardHatIcon,
  HouseIcon,
  HousePlusIcon,
  LandmarkIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react";

import { clientTypes } from "@/lib/site-config";

const icons: Record<(typeof clientTypes)[number]["icon"], LucideIcon> = {
  corporate: Building2Icon,
  government: LandmarkIcon,
  education: GraduationCapIcon,
  developers: HousePlusIcon,
  banks: BanknoteIcon,
  individuals: HouseIcon,
  legal: GavelIcon,
  construction: HardHatIcon,
  owners: StoreIcon,
  ngos: HandHeartIcon,
};

/** "Our clients": the kinds of organisations and people we work with. */
export function ClientTypes({ id = "our-clients" }: { id?: string }) {
  return (
    <section aria-labelledby={id} className="container-page py-16 sm:py-20">
      <div className="max-w-2xl">
        <h2 id={id} className="text-3xl font-bold sm:text-4xl">
          Our clients
        </h2>
        <p className="text-muted-foreground mt-3 text-lg">
          We proudly serve a diverse range of clients, including:
        </p>
      </div>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {clientTypes.map(({ label, icon }) => {
          const Icon = icons[icon];
          return (
            <li
              key={label}
              className="bg-card flex items-center gap-3 rounded-2xl border p-4 lg:flex-col lg:items-start"
            >
              <span className="bg-secondary text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="font-medium">{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
