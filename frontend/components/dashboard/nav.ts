import {
  Building2Icon,
  InboxIcon,
  LayoutDashboardIcon,
  NewspaperIcon,
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
  { title: "Enquiries", href: "/dashboard/enquiries", icon: InboxIcon },
  { title: "Properties", href: "/dashboard/properties", icon: Building2Icon },
  { title: "Blog", href: "/dashboard/blog", icon: NewspaperIcon },
  { title: "Security", href: "/dashboard/security", icon: ShieldCheckIcon },
];
