"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, api } from "./client";
import type { components } from "./schema";

export type TeamMember = components["schemas"]["DashboardTeamMember"];
export type Testimonial = components["schemas"]["DashboardTestimonial"];
export type Faq = components["schemas"]["DashboardFaq"];
export type Job = components["schemas"]["DashboardJob"];

/** The three ordered lists share one shape of API: list, create, update, delete, reorder. */
export type OrderedResource = "team" | "testimonials" | "faqs";
type ItemOf = { team: TeamMember; testimonials: Testimonial; faqs: Faq };

const base = (resource: string) => `/api/v1/dashboard/content/${resource}/`;
const contentKey = (resource: string) => ["dashboard", "content", resource];
type Errors = Record<string, string[] | string | undefined>;

/** Thrown when the API rejects a save; carries the field errors. */
export class SaveError extends Error {
  constructor(public fields: Errors) {
    super("save failed");
  }
}

// openapi-fetch types each path literally; these generic helpers address them by name.
const untyped = api as unknown as {
  GET: (
    p: string,
    o?: object,
  ) => Promise<{ data?: unknown; response: Response }>;
  POST: (
    p: string,
    o?: object,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
  PATCH: (
    p: string,
    o?: object,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
  DELETE: (p: string, o?: object) => Promise<{ response: Response }>;
};

export function useOrderedList<R extends OrderedResource>(resource: R) {
  return useQuery({
    queryKey: contentKey(resource),
    queryFn: async () => {
      const result = await untyped.GET(base(resource));
      if (!result.response.ok) throw new ApiError(result.response.status);
      return result.data as ItemOf[R][];
    },
  });
}

export function useOrderedMutations<R extends OrderedResource>(resource: R) {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: contentKey(resource) });
  const save = useMutation({
    mutationFn: async ({ uuid, body }: { uuid?: string; body: object }) => {
      const result = uuid
        ? await untyped.PATCH(`${base(resource)}${uuid}/`, { body })
        : await untyped.POST(base(resource), { body });
      if (!result.response.ok)
        throw new SaveError((result.error ?? {}) as Errors);
      return result.data as ItemOf[R];
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (uuid: string) => {
      const result = await untyped.DELETE(`${base(resource)}${uuid}/`);
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onSuccess: refresh,
  });
  const reorder = useMutation({
    mutationFn: async (uuids: string[]) => {
      const result = await untyped.POST(`${base(resource)}reorder/`, {
        body: { uuids },
      });
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onMutate: async (uuids) => {
      // Move the rows straight away; the server confirms.
      await queryClient.cancelQueries({ queryKey: contentKey(resource) });
      queryClient.setQueryData<ItemOf[R][]>(contentKey(resource), (old) =>
        old
          ? uuids
              .map((u) => old.find((item) => item.uuid === u))
              .filter((item): item is ItemOf[R] => !!item)
          : old,
      );
    },
    onSettled: refresh,
  });
  return { save, remove, reorder };
}

export const jobsKey = contentKey("jobs");

export function useJobs() {
  return useQuery({
    queryKey: jobsKey,
    queryFn: async () => {
      const result = await api.GET("/api/v1/dashboard/content/jobs/");
      if (!result.data) throw new ApiError(result.response.status);
      return result.data;
    },
  });
}

export function useJob(uuid: string) {
  return useQuery({
    queryKey: [...jobsKey, uuid],
    queryFn: async () => {
      const result = await api.GET("/api/v1/dashboard/content/jobs/{uuid}/", {
        params: { path: { uuid } },
      });
      if (!result.data) throw new ApiError(result.response.status);
      return result.data;
    },
  });
}
