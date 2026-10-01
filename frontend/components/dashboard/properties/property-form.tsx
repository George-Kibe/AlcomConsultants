"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { cn } from "cn";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api/client";
import { queryKeys, useLookups } from "@/lib/api/hooks";
import type { components } from "@/lib/api/schema";
import { formatDate } from "@/lib/format";
import {
  DEAL_TYPES,
  FURNISHING,
  LAND_UNITS,
  PRICE_UNITS,
  STATUSES,
  emptyListing,
  fromApi,
  listingSchema,
  toPayload,
  type ListingFormValues,
} from "@/lib/listing-form";

import { PhotoManager } from "./photo-manager";
import { StatusBadge } from "./status-badge";

type ApiProperty = components["schemas"]["DashboardProperty"];

const errorBody = (result: object) => (result as { error?: unknown }).error;
const NONE = "__none__"; // Radix Select can't use "" as a value

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type Props = { property?: ApiProperty };

export function PropertyForm({ property }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const lookups = useLookups();
  const id = useId();
  const isNew = !property;

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: property ? fromApi(property) : emptyListing,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setValue, setError, formState } =
    form;
  const { errors, isDirty, isSubmitting } = formState;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, isSubmitting]);

  const [countyId, areaId, priceOnRequest] = useWatch({
    control,
    name: ["county", "area", "price_on_request"],
  });
  const county = lookups.data?.counties.find((c) => String(c.id) === countyId);
  const area = county?.areas.find((a) => String(a.id) === areaId);
  const amenityGroups = useMemo(() => {
    const groups = new Map<string, { slug: string; name: string }[]>();
    for (const a of lookups.data?.amenities ?? []) {
      groups.set(a.group, [...(groups.get(a.group) ?? []), a]);
    }
    return [...groups.entries()];
  }, [lookups.data]);

  const save = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      const body = toPayload(values);
      const fail = (status: number, error: unknown) =>
        Object.assign(new ApiError(status), {
          fieldErrors: error as Record<string, string[] | string>,
        });
      if (property) {
        const result = await api.PATCH("/api/v1/dashboard/properties/{uuid}/", {
          params: { path: { uuid: property.uuid } },
          body,
        });
        // Error bodies aren't in the OpenAPI types, so check the HTTP status.
        if (!result.response.ok)
          throw fail(result.response.status, errorBody(result));
        return result.data!;
      }
      const result = await api.POST("/api/v1/dashboard/properties/", { body });
      if (!result.response.ok)
        throw fail(result.response.status, errorBody(result));
      return result.data!;
    },
    onSuccess: (saved, values) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      queryClient.setQueryData(queryKeys.property(saved.uuid), saved);
      form.reset(fromApi(saved));
      toast.success(
        isNew
          ? `${saved.reference} created${values.status === "published" ? " and published" : " as a draft"}`
          : "Changes saved",
      );
      if (isNew) router.replace(`/dashboard/properties/${saved.uuid}`);
    },
    onError: (
      error: ApiError & { fieldErrors?: Record<string, string[] | string> },
    ) => {
      const fields = error.fieldErrors ?? {};
      let shown = false;
      for (const [name, messages] of Object.entries(fields)) {
        const message = Array.isArray(messages) ? messages[0] : messages;
        if (name in emptyListing) {
          setError(name as FieldPath<ListingFormValues>, { message });
          shown = true;
        }
      }
      toast.error(
        shown
          ? "Please fix the highlighted fields."
          : "Couldn't save. Please try again.",
      );
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const result = await api.DELETE("/api/v1/dashboard/properties/{uuid}/", {
        params: { path: { uuid: property!.uuid } },
      });
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      toast.success("Draft deleted");
      router.replace("/dashboard/properties");
    },
    onError: () => toast.error("Couldn't delete this listing."),
  });

  const submit = (status?: ListingFormValues["status"]) =>
    handleSubmit(
      (values) => save.mutate(status ? { ...values, status } : values),
      () => toast.error("Please fix the highlighted fields."),
    );

  const f = (name: string) => `${id}-${name}`;
  const fieldError = (name: keyof ListingFormValues) =>
    errors[name]?.message as string | undefined;
  const visible =
    property &&
    ["published", "under_offer", "sold", "let"].includes(property.status ?? "");

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit()();
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link
              href="/dashboard/properties"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Properties
            </Link>{" "}
            / {property ? property.reference : "New"}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {property ? property.title : "Add a property"}
          </h1>
          {property && (
            <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={property.status ?? "draft"} />
              Updated {formatDate(property.updated_at)}
              {property.updated_by ? ` by ${property.updated_by}` : ""}
            </p>
          )}
        </div>
        {property && (
          <div className="flex gap-2">
            {visible && (
              <Button asChild variant="outline">
                <Link href={`/properties/${property.slug}`} target="_blank">
                  View on site
                  <ExternalLinkIcon data-icon="inline-end" />
                </Link>
              </Button>
            )}
            {property.status === "draft" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button">
                    <Trash2Icon data-icon="inline-start" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {property.reference} and its photos will be removed. This
                      can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove.mutate()}>
                      Delete draft
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      <Section title="Basics">
        <Field
          label="Title"
          htmlFor={f("title")}
          error={fieldError("title")}
          hint="e.g. 3 Bedroom Apartment with Pool, Kilimani"
        >
          <Input
            id={f("title")}
            {...register("title")}
            aria-invalid={!!errors.title}
            className="h-11"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Deal"
            htmlFor={f("deal_type")}
            error={fieldError("deal_type")}
          >
            <Controller
              control={control}
              name="deal_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={f("deal_type")} className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            label="Property type"
            htmlFor={f("property_type")}
            error={fieldError("property_type")}
          >
            <Controller
              control={control}
              name="property_type"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id={f("property_type")}
                    className="h-11 w-full"
                    aria-invalid={!!errors.property_type}
                  >
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.data?.property_types.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name} · {t.group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
        <Field
          label="Description"
          htmlFor={f("description")}
          error={fieldError("description")}
          hint="Describe the property, its surroundings and what's included. Blank lines start new paragraphs."
        >
          <Textarea
            id={f("description")}
            className="min-h-48"
            rows={8}
            {...register("description")}
            aria-invalid={!!errors.description}
          />
        </Field>
      </Section>

      {property ? (
        <PhotoManager propertyUuid={property.uuid} />
      ) : (
        <Section title="Photos & floor plans">
          <p className="text-muted-foreground text-sm">
            Save the listing (as a draft is fine), then add photos here.
          </p>
        </Section>
      )}

      <Section title="Price">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Price (KES)"
            htmlFor={f("price")}
            error={fieldError("price")}
            hint="Numbers only, e.g. 15000000"
          >
            <Input
              id={f("price")}
              inputMode="numeric"
              disabled={priceOnRequest}
              {...register("price")}
              aria-invalid={!!errors.price}
              className="h-11"
            />
          </Field>
          <Field label="Price is" htmlFor={f("price_unit")}>
            <Controller
              control={control}
              name="price_unit"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={f("price_unit")} className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
        <Controller
          control={control}
          name="price_on_request"
          render={({ field }) => (
            <label className="flex items-center gap-3">
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
              <span>Price on request (don&apos;t show a price)</span>
            </label>
          )}
        />
      </Section>

      <Section title="Details">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(["bedrooms", "bathrooms", "parking_spaces"] as const).map(
            (name) => (
              <Field
                key={name}
                label={
                  name === "parking_spaces"
                    ? "Parking spaces"
                    : name[0].toUpperCase() + name.slice(1)
                }
                htmlFor={f(name)}
                error={fieldError(name)}
              >
                <Input
                  id={f(name)}
                  inputMode="numeric"
                  {...register(name)}
                  className="h-11"
                />
              </Field>
            ),
          )}
          <Field
            label="Built area (m²)"
            htmlFor={f("built_area_sqm")}
            error={fieldError("built_area_sqm")}
          >
            <Input
              id={f("built_area_sqm")}
              inputMode="decimal"
              {...register("built_area_sqm")}
              className="h-11"
            />
          </Field>
          <Field
            label="Land size"
            htmlFor={f("land_area")}
            error={fieldError("land_area")}
          >
            <div className="flex gap-2">
              <Input
                id={f("land_area")}
                inputMode="decimal"
                {...register("land_area")}
                className="h-11"
              />
              <Controller
                control={control}
                name="land_area_unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className="h-11 w-28"
                      aria-label="Land size unit"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LAND_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </Field>
          <Field label="Furnishing" htmlFor={f("furnishing")}>
            <Controller
              control={control}
              name="furnishing"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <SelectTrigger id={f("furnishing")} className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not specified</SelectItem>
                    {FURNISHING.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </Section>

      <Section title="Amenities">
        <Controller
          control={control}
          name="amenities"
          render={({ field }) => (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {amenityGroups.map(([group, items]) => (
                <fieldset key={group} className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-semibold">
                    {group}
                  </legend>
                  {items.map((a) => (
                    <label
                      key={a.slug}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={field.value.includes(a.slug)}
                        onCheckedChange={(on) =>
                          field.onChange(
                            on
                              ? [...field.value, a.slug]
                              : field.value.filter((s) => s !== a.slug),
                          )
                        }
                      />
                      {a.name}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          )}
        />
      </Section>

      <Section
        title="Location"
        description="Choose the county first, then the area."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="County"
            htmlFor={f("county")}
            error={fieldError("county")}
          >
            <Controller
              control={control}
              name="county"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue("area", "", { shouldDirty: true });
                    setValue("neighbourhood", "", { shouldDirty: true });
                  }}
                >
                  <SelectTrigger
                    id={f("county")}
                    className="h-11 w-full"
                    aria-invalid={!!errors.county}
                  >
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.data?.counties.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            label="Area"
            htmlFor={f("area")}
            error={fieldError("area")}
            hint={
              county && county.areas.length === 0
                ? "No areas yet for this county — add one in the admin."
                : undefined
            }
          >
            <Controller
              control={control}
              name="area"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  disabled={!county}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue("neighbourhood", "", { shouldDirty: true });
                  }}
                >
                  <SelectTrigger
                    id={f("area")}
                    className="h-11 w-full"
                    aria-invalid={!!errors.area}
                  >
                    <SelectValue
                      placeholder={county ? "Choose…" : "Choose a county first"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {county?.areas.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            label="Neighbourhood (optional)"
            htmlFor={f("neighbourhood")}
            error={fieldError("neighbourhood")}
          >
            <Controller
              control={control}
              name="neighbourhood"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  disabled={!area || area.neighbourhoods.length === 0}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <SelectTrigger
                    id={f("neighbourhood")}
                    className="h-11 w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not specified</SelectItem>
                    {area?.neighbourhoods.map((n) => (
                      <SelectItem key={n.id} value={String(n.id)}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Latitude (optional)"
            htmlFor={f("lat")}
            error={fieldError("lat")}
            hint="From Google Maps: right-click the spot and copy the numbers, e.g. -1.2921"
          >
            <Input
              id={f("lat")}
              inputMode="decimal"
              {...register("lat")}
              className="h-11"
            />
          </Field>
          <Field
            label="Longitude (optional)"
            htmlFor={f("lng")}
            error={fieldError("lng")}
            hint="e.g. 36.8219"
          >
            <Input
              id={f("lng")}
              inputMode="decimal"
              {...register("lng")}
              className="h-11"
            />
          </Field>
        </div>
        <Controller
          control={control}
          name="show_exact_location"
          render={({ field }) => (
            <label className="flex items-center gap-3">
              <Switch checked={field.value} onCheckedChange={field.onChange} />
              <span>
                Show the exact location on the public map
                <span className="text-muted-foreground block text-xs">
                  Otherwise visitors see an approximate position (about 1 km).
                </span>
              </span>
            </label>
          )}
        />
      </Section>

      <Section title="Contact & links">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Staff contact"
            htmlFor={f("agent")}
            hint="Shown on the listing with their phone number."
          >
            <Controller
              control={control}
              name="agent"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <SelectTrigger id={f("agent")} className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      Office (no named contact)
                    </SelectItem>
                    {lookups.data?.agents.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Development project (optional)" htmlFor={f("project")}>
            <Controller
              control={control}
              name="project"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <SelectTrigger id={f("project")} className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {lookups.data?.projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
        <Field
          label="Video link (optional)"
          htmlFor={f("video_url")}
          error={fieldError("video_url")}
          hint="YouTube or Vimeo"
        >
          <Input
            id={f("video_url")}
            type="url"
            placeholder="https://www.youtube.com/watch?v=…"
            {...register("video_url")}
            className="h-11"
          />
        </Field>
      </Section>

      <Section title="Visibility">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Status"
            htmlFor={f("status")}
            hint="Only Published and Under offer listings appear in search. Sold and let pages stay online."
          >
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={f("status")} className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Controller
            control={control}
            name="is_featured"
            render={({ field }) => (
              <label className="flex items-center gap-3 sm:pt-7">
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <span>Feature on the home page</span>
              </label>
            )}
          />
        </div>
        <details className="group">
          <summary className="text-primary cursor-pointer text-sm font-medium">
            Search engine settings (optional)
          </summary>
          <div className="mt-4 grid gap-4">
            <Field
              label="SEO title"
              htmlFor={f("seo_title")}
              error={fieldError("seo_title")}
              hint="Defaults to the listing title. Max 70 characters."
            >
              <Input
                id={f("seo_title")}
                {...register("seo_title")}
                className="h-11"
              />
            </Field>
            <Field
              label="SEO description"
              htmlFor={f("seo_description")}
              error={fieldError("seo_description")}
              hint="One or two sentences shown in Google results. Max 160 characters."
            >
              <Textarea
                id={f("seo_description")}
                rows={2}
                {...register("seo_description")}
              />
            </Field>
          </div>
        </details>
      </Section>

      <div className="bg-background/95 sticky bottom-0 -mx-4 flex flex-col gap-2 border-t px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-xl sm:border">
        {isNew ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="xl"
              disabled={save.isPending}
              onClick={() => void submit("draft")()}
            >
              Save as draft
            </Button>
            <Button
              type="button"
              size="xl"
              disabled={save.isPending}
              onClick={() => void submit("published")()}
            >
              Publish
            </Button>
          </>
        ) : (
          <Button type="submit" size="xl" disabled={save.isPending || !isDirty}>
            {save.isPending ? "Saving…" : isDirty ? "Save changes" : "Saved"}
          </Button>
        )}
      </div>
    </form>
  );
}
