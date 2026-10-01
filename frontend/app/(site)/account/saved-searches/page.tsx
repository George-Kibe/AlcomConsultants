import type { Metadata } from "next";

import { SavedSearchList } from "@/components/account/saved-search-list";

export const metadata: Metadata = { title: "Saved searches" };

export default function SavedSearchesPage() {
  return <SavedSearchList />;
}
