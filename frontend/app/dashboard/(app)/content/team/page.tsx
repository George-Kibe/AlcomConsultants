import type { Metadata } from "next";

import { TeamManager } from "@/components/dashboard/content/team-manager";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <TeamManager />;
}
