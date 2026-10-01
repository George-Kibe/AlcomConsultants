import type { components } from "@/lib/api/schema";

export type UploadSignature = components["schemas"]["UploadSignature"];

export type CloudinaryUploadResult = {
  public_id: string;
  version: number;
  signature: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
};

export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];

/** Why a file can't be uploaded, or undefined if it's fine. */
export function rejectReason(file: File, maxBytes: number): string | undefined {
  if (
    !ACCEPTED_TYPES.includes(file.type) &&
    !/\.(heic|heif)$/i.test(file.name)
  ) {
    return "Only photos (JPG, PNG, WebP, AVIF, HEIC) can be uploaded.";
  }
  if (file.size > maxBytes) {
    return `Too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`;
  }
  return undefined;
}

/** Direct, signed upload to Cloudinary with progress (fetch has no upload progress). */
export function uploadToCloudinary(
  file: File,
  sig: UploadSignature,
  onProgress: (fraction: number) => void,
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", sig.api_key);
    body.append("timestamp", String(sig.timestamp));
    body.append("folder", sig.folder);
    body.append("allowed_formats", sig.allowed_formats);
    body.append("signature", sig.signature);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", sig.upload_url);
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let json:
        (CloudinaryUploadResult & { error?: { message: string } }) | undefined;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json) resolve(json);
      else
        reject(
          new Error(json?.error?.message ?? `Upload failed (${xhr.status})`),
        );
    };
    xhr.onerror = () =>
      reject(new Error("Network error — check your connection."));
    xhr.send(body);
  });
}
