import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentMembership } from "@/lib/auth/rbac";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import {
  uploadImage,
  deleteImage,
  propertyObjectFolder,
  getSignedImageUrl,
} from "@/lib/storage/cloudinary";

export const runtime = "nodejs";

/**
 * POST /api/properties/photos
 * Upload a property photo (up to 4 allowed).
 * Property photos are NOT PII — stored as Cloudinary public assets.
 */
export async function POST(request: NextRequest) {
  const membership = await getCurrentMembership();
  if (!membership || !can(membership.role, "property:update")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("photo");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "No photo file provided" },
      { status: 400 },
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: "File too large (max 5 MB)" },
      { status: 400 },
    );
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Only JPEG, PNG and WebP images are accepted" },
      { status: 400 },
    );
  }

  // Check current photo count
  const [property] = await db
    .select({ photoUrls: properties.photoUrls })
    .from(properties)
    .where(eq(properties.id, membership.property.id))
    .limit(1);

  if (!property) {
    return NextResponse.json({ ok: false, error: "Property not found" }, { status: 404 });
  }

  if (property.photoUrls.length >= 4) {
    return NextResponse.json(
      { ok: false, error: "Maximum of 4 property photos allowed" },
      { status: 400 },
    );
  }

  // Upload to Cloudinary (using public access since property photos aren't PII)
  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = propertyObjectFolder(membership.property.id, "property-images");
  const uploaded = await uploadImage(buffer, { folder, access: "public" });

  const newPhotos = [...property.photoUrls, uploaded.publicId];

  await db
    .update(properties)
    .set({ photoUrls: newPhotos })
    .where(eq(properties.id, membership.property.id));

  // Return the signed URL so the client can render it immediately
  const url = getSignedImageUrl(uploaded.publicId, { access: "public" });

  return NextResponse.json({ ok: true, publicId: uploaded.publicId, url });
}

/**
 * DELETE /api/properties/photos?publicId=xyz
 * Delete a property photo.
 */
export async function DELETE(request: NextRequest) {
  const membership = await getCurrentMembership();
  if (!membership || !can(membership.role, "property:update")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const publicId = searchParams.get("publicId");

  if (!publicId) {
    return NextResponse.json({ ok: false, error: "Missing publicId" }, { status: 400 });
  }

  const [property] = await db
    .select({ photoUrls: properties.photoUrls })
    .from(properties)
    .where(eq(properties.id, membership.property.id))
    .limit(1);

  if (!property || !property.photoUrls.includes(publicId)) {
    return NextResponse.json({ ok: false, error: "Photo not found in property" }, { status: 404 });
  }

  try {
    await deleteImage(publicId, { access: "public" });
  } catch (err) {
    console.error("Failed to delete from Cloudinary:", err);
    // Continue deleting from DB even if Cloudinary fails, to heal broken links
  }

  const newPhotos = property.photoUrls.filter((id) => id !== publicId);

  await db
    .update(properties)
    .set({ photoUrls: newPhotos })
    .where(eq(properties.id, membership.property.id));

  return NextResponse.json({ ok: true });
}
