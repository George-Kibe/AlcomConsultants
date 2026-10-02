"use client";

import { ImagePlusIcon, PlusIcon, UserRoundIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { CloudImage } from "@/components/cloud-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { useOrderedMutations, type TeamMember } from "@/lib/api/content";
import {
  ACCEPTED_TYPES,
  rejectReason,
  uploadToCloudinary,
  type CloudinaryUploadResult,
} from "@/lib/uploads";

import { Field } from "../form-parts";
import { ContentHeader } from "./content-tabs";
import { FormDialog } from "./form-dialog";
import { OrderedList } from "./ordered-list";

function Avatar({ publicId, name }: { publicId?: string; name: string }) {
  return publicId ? (
    <CloudImage
      src={publicId}
      alt={name}
      width={96}
      height={96}
      crop="fill"
      gravity="face"
      className="size-12 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full">
      <UserRoundIcon className="size-6" aria-hidden />
    </span>
  );
}

/** Choose a photo: uploaded straight to Cloudinary, attached when the member is saved. */
function PhotoPicker({
  current,
  name,
  upload,
  onUpload,
  removed,
  onRemove,
}: {
  current?: string;
  name: string;
  upload: CloudinaryUploadResult | null;
  onUpload: (u: CloudinaryUploadResult | null) => void;
  removed: boolean;
  onRemove: (r: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const shown = upload?.public_id ?? (removed ? undefined : current);

  async function choose(file: File) {
    const sig = await api.POST("/api/v1/dashboard/uploads/signature/", {
      body: { target: "team" },
    });
    if (!sig.data) return toast.error("Couldn't start the upload.");
    const problem = rejectReason(file, sig.data.max_bytes);
    if (problem) return toast.error(problem);
    setProgress(0);
    try {
      onUpload(await uploadToCloudinary(file, sig.data, setProgress));
      onRemove(false);
    } catch (e) {
      toast.error((e as Error).message || "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void choose(file);
        }}
      />
      <Avatar publicId={shown} name={name || "Team member"} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={progress !== null}
          onClick={() => input.current?.click()}
        >
          <ImagePlusIcon data-icon="inline-start" />
          {progress !== null
            ? `Uploading ${Math.round(progress * 100)}%`
            : shown
              ? "Change photo"
              : "Add photo"}
        </Button>
        {shown && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onUpload(null);
              onRemove(true);
            }}
          >
            Remove photo
          </Button>
        )}
      </div>
    </div>
  );
}

export function TeamManager() {
  const id = useId();
  const [editing, setEditing] = useState<TeamMember | null | undefined>(
    undefined,
  );
  const [upload, setUpload] = useState<CloudinaryUploadResult | null>(null);
  const [removed, setRemoved] = useState(false);
  const [name, setName] = useState("");
  const { save } = useOrderedMutations("team");

  const open = (member: TeamMember | null) => {
    setUpload(null);
    setRemoved(false);
    setName(member?.name ?? "");
    setEditing(member);
  };

  return (
    <div className="flex flex-col gap-6">
      <ContentHeader
        description="People shown in “Our team” on the About page."
        action={
          <Button size="xl" onClick={() => open(null)}>
            <PlusIcon data-icon="inline-start" />
            Add team member
          </Button>
        }
      />
      <OrderedList
        resource="team"
        noun="Team member"
        label={(m: TeamMember) => m.name}
        onEdit={(m: TeamMember) => open(m)}
        render={(m: TeamMember) => (
          <div className="flex items-center gap-3">
            <Avatar publicId={m.photo?.public_id} name={m.name} />
            <div className="min-w-0">
              <p className="font-medium">{m.name}</p>
              <p className="text-muted-foreground text-sm">{m.role}</p>
            </div>
          </div>
        )}
        empty={
          <p className="text-muted-foreground">
            No team members yet. The section stays hidden on the website until
            you add one.
          </p>
        }
      />
      <FormDialog
        key={editing?.uuid ?? (editing === null ? "new" : "closed")}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? `Edit ${editing.name}` : "Add team member"}
        save={(form) =>
          save.mutateAsync({
            uuid: editing?.uuid,
            body: {
              name: String(form.get("name")),
              role: String(form.get("role")),
              bio: String(form.get("bio")),
              email: String(form.get("email")),
              linkedin_url: String(form.get("linkedin_url")),
              ...(upload && { photo_upload: upload }),
              ...(removed && { remove_photo: true }),
            },
          })
        }
      >
        {(errors) => (
          <>
            <PhotoPicker
              current={editing?.photo?.public_id}
              name={name}
              upload={upload}
              onUpload={setUpload}
              removed={removed}
              onRemove={setRemoved}
            />
            {errors.photo_upload && (
              <p className="text-destructive text-sm" role="alert">
                {errors.photo_upload}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor={`${id}-n`} error={errors.name}>
                <Input
                  id={`${id}-n`}
                  name="name"
                  defaultValue={editing?.name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11"
                />
              </Field>
              <Field
                label="Role"
                htmlFor={`${id}-r`}
                error={errors.role}
                hint='e.g. "Registered Valuer"'
              >
                <Input
                  id={`${id}-r`}
                  name="role"
                  defaultValue={editing?.role}
                  required
                  className="h-11"
                />
              </Field>
            </div>
            <Field
              label="Short bio (optional)"
              htmlFor={`${id}-b`}
              error={errors.bio}
            >
              <Textarea
                id={`${id}-b`}
                name="bio"
                rows={3}
                maxLength={1000}
                defaultValue={editing?.bio}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Email (optional, shown publicly)"
                htmlFor={`${id}-e`}
                error={errors.email}
              >
                <Input
                  id={`${id}-e`}
                  name="email"
                  type="email"
                  defaultValue={editing?.email}
                  className="h-11"
                />
              </Field>
              <Field
                label="LinkedIn (optional)"
                htmlFor={`${id}-l`}
                error={errors.linkedin_url}
              >
                <Input
                  id={`${id}-l`}
                  name="linkedin_url"
                  type="url"
                  placeholder="https://www.linkedin.com/in/…"
                  defaultValue={editing?.linkedin_url}
                  className="h-11"
                />
              </Field>
            </div>
          </>
        )}
      </FormDialog>
    </div>
  );
}
