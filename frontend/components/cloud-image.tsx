"use client";

import { CldImage, type CldImageProps } from "next-cloudinary";

import { cloudinaryConfig } from "@/lib/cloudinary";

/**
 * next/image backed by Cloudinary: `src` is a Cloudinary public ID. Cloudinary resizes
 * for each screen width and serves AVIF/WebP with automatic quality.
 */
export function CloudImage(props: CldImageProps) {
  return <CldImage config={cloudinaryConfig} {...props} />;
}
