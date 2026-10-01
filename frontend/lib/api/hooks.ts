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
  comments: ["dashboard", "comments"] as const,
  enquiries: ["dashboard", "enquiries"] as const,
  enquiry: (uuid: string) => ["dashboard", "enquiry", uuid] as const,
  enquirySummary: ["dashboard", "enquiries", "summary"] as const,
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

export type CommentListParams = { hidden?: string; q?: string; page?: number };

export function useDashboardComments(params: CommentListParams) {
  return useQuery({
    queryKey: [...queryKeys.comments, params],
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/dashboard/blog/comments/", {
          params: {
            query: {
              hidden:
                params.hidden === "" || params.hidden === undefined
                  ? undefined
                  : params.hidden === "true",
              q: params.q || undefined,
              page: params.page,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export type EnquiryListParams = {
  stage?: string;
  kind?: string;
  assigned?: string;
  due?: boolean;
  spam?: boolean;
  q?: string;
  page?: number;
};

export function useDashboardEnquiries(params: EnquiryListParams) {
  return useQuery({
    queryKey: [...queryKeys.enquiries, params],
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/dashboard/enquiries/", {
          params: {
            query: {
              stage: (params.stage || undefined) as never,
              kind: (params.kind || undefined) as never,
              assigned: params.assigned || undefined,
              due: params.due || undefined,
              spam: params.spam || undefined,
              q: params.q || undefined,
              page: params.page,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useDashboardEnquiry(uuid: string) {
  return useQuery({
    queryKey: queryKeys.enquiry(uuid),
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/dashboard/enquiries/{uuid}/", {
          params: { path: { uuid } },
        }),
      ),
  });
}

export function useEnquirySummary() {
  return useQuery({
    queryKey: queryKeys.enquirySummary,
    queryFn: async () =>
      unwrap(await api.GET("/api/v1/dashboard/enquiries/summary/")),
    refetchInterval: 60_000,
  });
}
