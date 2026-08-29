import "server-only";

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

/**
 * Cloudinary storage (server-only).
 *
 * ID photos are PII, so uploads default to delivery type "authenticated":
 * the asset is NOT reachable by a plain URL — delivery requires a
 * server-generated signed URL (spec §8/§10). Never upload PII as a public
 * ("upload") asset.
 *
 * Config is read from CLOUDINARY_URL
 * (cloudinary://<api_key>:<api_secret>@<cloud_name>). Init is lazy so importing
 * this module never fails a build before the env var is set — real calls throw
 * loudly without it.
 *
 * NOTE: signature-based access control gates who can view (URLs are minted
 * server-side for authorized roles only). Time-boxed expiry needs Cloudinary
 * auth tokens (an account feature) — tracked as Phase 6 hardening.
 */

/** Base folder for all app uploads (per user request). Override via env. */
export const UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "id-docs";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (!process.env.CLOUDINARY_URL) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL (cloudinary://<api_key>:<api_secret>@<cloud_name>).",
    );
  }
  // CLOUDINARY_URL is picked up automatically; force https delivery.
  cloudinary.config({ secure: true });
  configured = true;
}

export type ImageAccess = "authenticated" | "public";

/**
 * Canonical folder for a property-scoped asset, nested under the base upload
 * folder (default "id-docs"). Keeps per-property isolation in the path.
 */
export function propertyObjectFolder(
  propertyId: string,
  ...segments: string[]
): string {
  return [UPLOAD_FOLDER, "properties", propertyId, ...segments].join("/");
}

export type UploadedImage = {
  publicId: string;
  version: number;
  format: string;
  bytes: number;
  width: number;
  height: number;
};

/**
 * Upload image bytes. Returns the stored `publicId` — persist it; that's what
 * `getSignedImageUrl` / `deleteImage` need (self-consistent across Cloudinary's
 * fixed- and dynamic-folder modes). Defaults to private ("authenticated").
 */
export async function uploadImage(
  data: Buffer,
  opts: {
    folder: string;
    /** Optional fixed base name; omit to let Cloudinary generate a unique one. */
    publicId?: string;
    access?: ImageAccess;
  },
): Promise<UploadedImage> {
  ensureConfigured();
  const access = opts.access ?? "authenticated";
  // Cloudinary "type" param: "authenticated" for private assets, "upload" for public
  const type = access === "public" ? "upload" : "authenticated";

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        ...(opts.publicId ? { public_id: opts.publicId } : {}),
        type, // "authenticated" = not publicly reachable, "upload" = public
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
        use_filename: false,
        invalidate: true,
      },
      (error, res) => {
        if (error || !res) return reject(error ?? new Error("Upload failed"));
        resolve(res);
      },
    );
    stream.end(data);
  });

  return {
    publicId: result.public_id,
    version: result.version,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}

/**
 * Signed delivery URL for a private ("authenticated") image. The signature
 * gates access — the asset is unreachable without it. Mint these server-side
 * only for roles allowed to see the image (never for cleaners, per spec §3).
 */
export function getSignedImageUrl(
  publicId: string,
  opts: { access?: ImageAccess; version?: number } = {},
): string {
  ensureConfigured();
  const access = opts.access ?? "authenticated";
  const type = access === "public" ? "upload" : "authenticated";
  return cloudinary.url(publicId, {
    type,
    resource_type: "image",
    secure: true,
    sign_url: true,
    ...(opts.version ? { version: opts.version } : {}),
  });
}

/** Delete an image (used by the PII retention job in a later phase). */
export async function deleteImage(
  publicId: string,
  opts: { access?: ImageAccess } = {},
): Promise<void> {
  ensureConfigured();
  const access = opts.access ?? "authenticated";
  const type = access === "public" ? "upload" : "authenticated";
  await cloudinary.uploader.destroy(publicId, {
    type,
    resource_type: "image",
    invalidate: true,
  });
}
