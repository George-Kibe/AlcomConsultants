"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, api, unwrap } from "./client";

export const queryKeys = {
  me: ["me"] as const,
  overview: ["dashboard", "overview"] as const,
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
