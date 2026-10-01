import {
  AccessibilityIcon,
  AirVentIcon,
  ArrowUpDownIcon,
  BabyIcon,
  BathIcon,
  Building2Icon,
  CarIcon,
  CctvIcon,
  CheckIcon,
  DoorClosedIcon,
  DropletIcon,
  DropletsIcon,
  DumbbellIcon,
  HouseIcon,
  PanelTopIcon,
  PawPrintIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  ShirtIcon,
  SunIcon,
  SunsetIcon,
  TreesIcon,
  UtensilsIcon,
  WavesIcon,
  WifiIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

/** Icons named in the amenities seed data (anything else gets a tick). */
const ICONS: Record<string, LucideIcon> = {
  "shield-check": ShieldCheckIcon,
  cctv: CctvIcon,
  zap: ZapIcon,
  "door-closed": DoorClosedIcon,
  droplets: DropletsIcon,
  droplet: DropletIcon,
  "plug-zap": PlugZapIcon,
  sun: SunIcon,
  wifi: WifiIcon,
  waves: WavesIcon,
  dumbbell: DumbbellIcon,
  "arrow-up-down": ArrowUpDownIcon,
  baby: BabyIcon,
  "building-2": Building2Icon,
  sunset: SunsetIcon,
  car: CarIcon,
  trees: TreesIcon,
  "panel-top": PanelTopIcon,
  house: HouseIcon,
  utensils: UtensilsIcon,
  bath: BathIcon,
  shirt: ShirtIcon,
  "air-vent": AirVentIcon,
  "paw-print": PawPrintIcon,
  accessibility: AccessibilityIcon,
};

export function AmenityIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || CheckIcon;
  return <Icon className={className} aria-hidden />;
}
