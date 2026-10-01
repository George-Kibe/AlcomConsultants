import {
  Building2Icon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const dashboardNav: DashboardNavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Properties", href: "/dashboard/properties", icon: Building2Icon },
  { title: "Security", href: "/dashboard/security", icon: ShieldCheckIcon },
];
