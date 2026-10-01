/** Cloudinary delivery settings. The cloud name is public (it appears in every image URL). */
export const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "ictdclhd";

/** Folder of the site's own imagery (hero photos, sample listings). */
export const SITE_IMAGES = "alcom_images/site";

export const cloudinaryConfig = {
  cloud: { cloudName: CLOUDINARY_CLOUD_NAME },
  url: { secure: true, analytics: false },
};

/** Cloudinary delivery URL with transformations, e.g. "c_fill,w_1200,h_630,f_jpg,q_auto". */
export function cloudinaryUrl(
  publicId: string,
  transform = "f_auto,q_auto",
): string {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${publicId}`;
}
