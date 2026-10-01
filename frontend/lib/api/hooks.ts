"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ApiError, api, unwrap } from "./client";

export const queryKeys = {
  me: ["me"] as const,
  overview: ["dashboard", "overview"] as const,
  lookups: ["dashboard", "lookups"] as const,
  properties: ["dashboard", "properties"] as const,
  property: (uuid: string) => ["dashboard", "property", uuid] as const,
  posts: ["dashboard", "posts"] as const,
  post: (uuid: string) => ["dashboard", "post", uuid] as const,
};

export type PropertyListParams = {
  status?: string;
  q?: string;
  page?: number;
  sort?: string;
};

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => unwrap(await api.GET("/api/v1/me/")),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status < 500) && count < 2,
    staleTime: 60_000,
  });
}

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: async () => unwrap(await api.GET("/api/v1/dashboard/overview/")),
  });
}

export function useLookups() {
  return useQuery({
    queryKey: queryKeys.lookups,
    queryFn: async () => unwrap(await api.GET("/api/v1/dashboard/lookups/")),
    staleTime: 5 * 60_000,
  });
}

export function useDashboardProperties(params: PropertyListParams) {
  return useQuery({
    queryKey: [...queryKeys.properties, params],
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/dashboard/properties/", {
          params: {
            query: {
              status: (params.status || undefined) as never,
              q: params.q || undefined,
              page: params.page,
              sort: (params.sort || undefined) as never,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useDashboardProperty(uuid: string) {
  return useQuery({
    queryKey: queryKeys.property(uuid),
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/dashboard/properties/{uuid}/", {
          params: { path: { uuid } },
        }),
      ),
  });
}

export type PostListParams = { status?: string; q?: string; page?: number };

export function useDashboardPosts(params: PostListParams) {
  return useQuery({
    queryKey: [...queryKeys.posts, params],
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/dashboard/blog/posts/", {
          params: {
            query: {
              status: (params.status || undefined) as never,
              q: params.q || undefined,
              page: params.page,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useDashboardPost(uuid: string) {
  return useQuery({
    queryKey: queryKeys.post(uuid),
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/dashboard/blog/posts/{uuid}/", {
          params: { path: { uuid } },
        }),
      ),
  });
}
