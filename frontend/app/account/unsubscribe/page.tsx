import type { Metadata } from "next";

import { Unsubscribe } from "@/components/account/unsubscribe";

export const metadata: Metadata = { title: "Stop saved-search emails" };

export default async function UnsubscribePage({
  searchParams,
}: PageProps<"/account/unsubscribe">) {
  const { token } = await searchParams;
  return <Unsubscribe token={typeof token === "string" ? token : ""} />;
}
