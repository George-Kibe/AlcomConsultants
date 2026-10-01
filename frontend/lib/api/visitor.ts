"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { ApiError, api, unwrap } from "./client";
import type { components } from "./schema";

export type Viewer = components["schemas"]["Me"];
export type SavedSearch = components["schemas"]["SavedSearch"];

/** React Query keys for the public site (the dashboard has its own client and keys). */
export const visitorKeys = {
  viewer: ["viewer"] as const,
  favourites: ["viewer", "favourites"] as const,
  favouriteSlugs: ["viewer", "favourites", "slugs"] as const,
  savedSearches: ["viewer", "saved-searches"] as const,
};

/** The signed-in visitor, or null when signed out. */
export const viewerQuery = queryOptions({
  queryKey: visitorKeys.viewer,
  queryFn: async (): Promise<Viewer | null> => {
    const result = await api.GET("/api/v1/me/");
    if (result.response.status === 401 || result.response.status === 403)
      return null;
    return unwrap(result);
  },
  staleTime: 60_000,
  retry: (count, error) =>
    !(error instanceof ApiError && error.status < 500) && count < 2,
});

export function useViewer() {
  return useQuery(viewerQuery);
}

/** For click handlers: the visitor, waiting for the first lookup if it's still running. */
export function useResolveViewer() {
  const queryClient = useQueryClient();
  return () => queryClient.ensureQueryData(viewerQuery).catch(() => null);
}

export function useFavouriteSlugs(enabled: boolean) {
  return useQuery({
    queryKey: visitorKeys.favouriteSlugs,
    queryFn: async () => unwrap(await api.GET("/api/v1/me/favourites/slugs/")),
    enabled,
    staleTime: 60_000,
  });
}

export function useFavourites() {
  return useQuery({
    queryKey: visitorKeys.favourites,
    queryFn: async () => unwrap(await api.GET("/api/v1/me/favourites/")),
  });
}

/** Save or un-save a property, updating every heart on the page straight away. */
export function useToggleFavourite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, save }: { slug: string; save: boolean }) => {
      const params = { params: { path: { slug } } };
      const result = save
        ? await api.PUT("/api/v1/me/favourites/{slug}/", params)
        : await api.DELETE("/api/v1/me/favourites/{slug}/", params);
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onMutate: async ({ slug, save }) => {
      await queryClient.cancelQueries({ queryKey: visitorKeys.favouriteSlugs });
      const before = queryClient.getQueryData<string[]>(
        visitorKeys.favouriteSlugs,
      );
      queryClient.setQueryData<string[]>(visitorKeys.favouriteSlugs, (old) =>
        save
          ? [...new Set([...(old ?? []), slug])]
          : (old ?? []).filter((s) => s !== slug),
      );
      return { before };
    },
    onError: (_error, _vars, context) =>
      queryClient.setQueryData(visitorKeys.favouriteSlugs, context?.before),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: visitorKeys.favourites }),
  });
}

export function useSavedSearches(enabled = true) {
  return useQuery({
    queryKey: visitorKeys.savedSearches,
    queryFn: async () => unwrap(await api.GET("/api/v1/me/saved-searches/")),
    enabled,
  });
}

/** After signing out or deleting the account: forget everything about the visitor. */
export function forgetViewer(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ["viewer"] });
}
