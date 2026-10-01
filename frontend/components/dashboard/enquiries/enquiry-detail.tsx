"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLinkIcon,
  MailIcon,
  PhoneIcon,
  ShieldAlertIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";

import { WhatsAppIcon } from "@/components/icons";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api/client";
import { queryKeys, useLookups } from "@/lib/api/hooks";
import {
  STAGES,
  kindLabel,
  whatsappNumber,
  type EnquiryDetail as Enquiry,
} from "@/lib/enquiries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Section } from "../form-parts";
import { StageBadge } from "./stage-badge";

const NOBODY = "none";
type Change = Partial<
  Pick<Enquiry, "stage" | "assigned_to" | "follow_up_on" | "is_spam">
>;

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function useUpdate(enquiry: Enquiry) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Change) => {
      const result = await api.PATCH("/api/v1/dashboard/enquiries/{uuid}/", {
        params: { path: { uuid: enquiry.uuid } },
        body,
      });
      if (!result.data) throw new ApiError(result.response.status);
      return result.data;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.enquiry(enquiry.uuid), next);
      void queryClient.invalidateQueries({ queryKey: queryKeys.enquiries });
    },
    onError: () => toast.error("Couldn't save the change. Please try again."),
  });
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function LeadControls({ enquiry }: { enquiry: Enquiry }) {
  const id = useId();
  const lookups = useLookups();
  const update = useUpdate(enquiry);
  const save = (change: Change, message: string) =>
    update.mutate(change, { onSuccess: () => toast.success(message) });

  return (
    <Section title="Lead">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-stage`}>Stage</Label>
        <Select
          value={enquiry.stage}
          onValueChange={(stage) =>
            save({ stage: stage as Enquiry["stage"] }, "Stage updated")
          }
          disabled={update.isPending}
        >
          <SelectTrigger id={`${id}-stage`} className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-assignee`}>Assigned to</Label>
        {lookups.data ? (
          <Select
            value={enquiry.assigned_to ? String(enquiry.assigned_to) : NOBODY}
            onValueChange={(v) =>
              save(
                { assigned_to: v === NOBODY ? null : Number(v) },
                v === NOBODY ? "Unassigned" : "Assigned",
              )
            }
            disabled={update.isPending}
          >
            <SelectTrigger id={`${id}-assignee`} className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NOBODY}>Nobody yet</SelectItem>
              {lookups.data.agents.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Skeleton className="h-11 w-full" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-follow`}>Follow up on</Label>
        <div className="flex gap-2">
          <Input
            id={`${id}-follow`}
            type="date"
            className="h-11"
            value={enquiry.follow_up_on ?? ""}
            disabled={update.isPending}
            onChange={(e) =>
              save(
                { follow_up_on: e.target.value || null },
                e.target.value ? "Follow-up date set" : "Follow-up cleared",
              )
            }
          />
          {enquiry.follow_up_on && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-11"
              disabled={update.isPending}
              onClick={() => save({ follow_up_on: null }, "Follow-up cleared")}
            >
              Clear
            </Button>
          )}
        </div>
        <p
          className={cn(
            "text-xs",
            enquiry.is_overdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {enquiry.is_overdue
            ? "Overdue. The assignee is reminded by email each morning."
            : "The assignee gets a reminder email that morning."}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={update.isPending}
        onClick={() =>
          save(
            { is_spam: !enquiry.is_spam },
            enquiry.is_spam ? "Moved back to enquiries" : "Marked as spam",
          )
        }
      >
        <ShieldAlertIcon data-icon="inline-start" />
        {enquiry.is_spam ? "Not spam" : "Mark as spam"}
      </Button>
    </Section>
  );
}

function Timeline({ enquiry }: { enquiry: Enquiry }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      const result = await api.POST(
        "/api/v1/dashboard/enquiries/{uuid}/notes/",
        { params: { path: { uuid: enquiry.uuid } }, body: { body } },
      );
      if (!result.data) throw new ApiError(result.response.status);
      return result.data;
    },
    onSuccess: (note) => {
      queryClient.setQueryData<Enquiry>(
        queryKeys.enquiry(enquiry.uuid),
        (old) => (old ? { ...old, notes: [...old.notes, note] } : old),
      );
      setBody("");
      toast.success("Note added");
    },
    onError: () => toast.error("Couldn't add the note."),
  });

  return (
    <Section title="Notes and history">
      <ol className="flex flex-col gap-3" aria-label="Timeline">
        <li className="text-muted-foreground text-sm">
          {formatDateTime(enquiry.created_at)} · Enquiry received from the
          website{enquiry.source_path ? ` (${enquiry.source_path})` : ""}.
        </li>
        {enquiry.notes.map((n) => (
          <li
            key={n.id}
            className={cn(
              n.is_system
                ? "text-muted-foreground text-sm"
                : "bg-muted/60 rounded-xl p-3",
            )}
          >
            {n.is_system ? (
              <>
                {formatDateTime(n.created_at)} · {n.body}
                {n.author_name ? ` (${n.author_name})` : ""}
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-1 text-xs">
                  {n.author_name || "Staff"} · {formatDateTime(n.created_at)}
                </p>
                <p className="whitespace-pre-wrap">{n.body}</p>
              </>
            )}
          </li>
        ))}
      </ol>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) add.mutate();
        }}
      >
        <Label htmlFor={`${id}-note`}>Add a note</Label>
        <Textarea
          id={`${id}-note`}
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="e.g. Called, viewing booked for Saturday 10am."
        />
        <Button
          type="submit"
          className="self-start"
          disabled={add.isPending || !body.trim()}
        >
          {add.isPending ? "Saving…" : "Add note"}
        </Button>
      </form>
    </Section>
  );
}

export function EnquiryDetailView({ enquiry }: { enquiry: Enquiry }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const wa = enquiry.phone ? whatsappNumber(enquiry.phone) : null;
  const firstName = enquiry.name.split(" ")[0];

  const remove = useMutation({
    mutationFn: async () => {
      const result = await api.DELETE("/api/v1/dashboard/enquiries/{uuid}/", {
        params: { path: { uuid: enquiry.uuid } },
      });
      if (!result.response.ok) throw new ApiError(result.response.status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.enquiries });
      toast.success("Enquiry deleted");
      router.replace("/dashboard/enquiries");
    },
    onError: () => toast.error("Couldn't delete the enquiry."),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">
            <Link
              href="/dashboard/enquiries"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Enquiries
            </Link>{" "}
            / {enquiry.reference}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {enquiry.name}
          </h1>
          <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
            <StageBadge stage={enquiry.stage ?? "new"} />
            {kindLabel(enquiry.kind)} · received{" "}
            {formatDateTime(enquiry.created_at)}
            {enquiry.is_spam && (
              <span className="text-destructive font-medium">· Spam</span>
            )}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost">
              <Trash2Icon data-icon="inline-start" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this enquiry?</AlertDialogTitle>
              <AlertDialogDescription>
                The enquiry, its notes and the person&apos;s details are removed
                for good. Use this for spam or when someone asks to be
                forgotten; otherwise mark the lead as lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => remove.mutate()}>
                Delete enquiry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Section title="Contact">
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a
                  href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Your enquiry ${enquiry.reference}`)}`}
                >
                  <MailIcon data-icon="inline-start" />
                  Email {firstName}
                </a>
              </Button>
              {enquiry.phone && (
                <Button asChild variant="outline">
                  <a href={`tel:${enquiry.phone.replace(/\s/g, "")}`}>
                    <PhoneIcon data-icon="inline-start" />
                    Call
                  </a>
                </Button>
              )}
              {wa && (
                <Button asChild variant="outline">
                  <a
                    href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello ${firstName}, this is Alcom Consultants about your enquiry ${enquiry.reference}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon
                      className="text-success size-4"
                      data-icon="inline-start"
                    />
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Email">{enquiry.email}</Detail>
              <Detail label="Phone">{enquiry.phone || "—"}</Detail>
              {enquiry.property ? (
                <Detail label="Property">
                  <Link
                    href={`/properties/${enquiry.property.slug}`}
                    target="_blank"
                    className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    {enquiry.property.reference} {enquiry.property.title}
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                  </Link>
                </Detail>
              ) : (
                enquiry.property_label && (
                  <Detail label="Property">
                    {enquiry.property_label} (no longer listed)
                  </Detail>
                )
              )}
              {enquiry.property_type && (
                <Detail label="Type of property">
                  {enquiry.property_type}
                </Detail>
              )}
              {enquiry.location && (
                <Detail label="Location">{enquiry.location}</Detail>
              )}
              {enquiry.purpose && (
                <Detail label="Valuation for">{enquiry.purpose_label}</Detail>
              )}
              {enquiry.units && <Detail label="Units">{enquiry.units}</Detail>}
            </dl>
            {enquiry.message ? (
              <blockquote className="bg-muted/60 rounded-xl p-4 whitespace-pre-wrap">
                {enquiry.message}
              </blockquote>
            ) : (
              <p className="text-muted-foreground text-sm">No message.</p>
            )}
            <p className="text-muted-foreground text-xs">
              Agreed to be contacted on {formatDateTime(enquiry.consent_at)}{" "}
              (privacy notice {enquiry.consent_version}).{" "}
              {enquiry.has_account ? "Has a website account. " : ""}
              Spam check: {enquiry.spam_check || "—"}.
            </p>
          </Section>
          <Timeline enquiry={enquiry} />
        </div>
        <div className="flex flex-col gap-6 lg:sticky lg:top-20">
          <LeadControls enquiry={enquiry} />
          {enquiry.closed_at && (
            <p className="text-muted-foreground text-sm">
              Closed {formatDate(enquiry.closed_at)}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function EnquiryDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
      <span className="sr-only">Loading enquiry…</span>
    </div>
  );
}
