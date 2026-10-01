import {
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
  { title: "Security", href: "/dashboard/security", icon: ShieldCheckIcon },
];
