/**
 * Shared image validation for ID photos and housekeeping proof photos
 * (spec §8). Used by both client forms and server handlers.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

export function isValidImageType(type: string): type is AcceptedImageType {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

/** Matches spec §8 `isValidIdImage`. */
export function isValidIdImage(file: File): boolean {
  return file.size <= MAX_IMAGE_BYTES && isValidImageType(file.type);
}

export function imageValidationMessage(file: File): string | null {
  if (!isValidImageType(file.type)) {
    return "Use a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}
