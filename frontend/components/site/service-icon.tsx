import {
  BuildingIcon,
  KeyRoundIcon,
  ScaleIcon,
  type LucideProps,
} from "lucide-react";

import type { Service } from "@/lib/site-config";

const icons = {
  "property-agency": KeyRoundIcon,
  "property-management": BuildingIcon,
  "property-valuations": ScaleIcon,
} satisfies Record<Service["slug"], unknown>;

export function ServiceIcon({
  slug,
  ...props
}: LucideProps & { slug: Service["slug"] }) {
  const Icon = icons[slug];
  return <Icon aria-hidden {...props} />;
}
