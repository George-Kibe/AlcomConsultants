import type { Metadata } from "next";

import { FavouritesList } from "@/components/account/favourites-list";

export const metadata: Metadata = { title: "Saved properties" };

export default function FavouritesPage() {
  return <FavouritesList />;
}
