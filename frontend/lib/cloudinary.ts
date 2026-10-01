/** Cloudinary delivery settings. The cloud name is public (it appears in every image URL). */
export const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "ictdclhd";

/** Folder of the site's own imagery (hero photos, sample listings). */
export const SITE_IMAGES = "alcom_images/site";

export const cloudinaryConfig = {
  cloud: { cloudName: CLOUDINARY_CLOUD_NAME },
  url: { secure: true, analytics: false },
};
