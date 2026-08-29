import { NextResponse } from "next/server";

import { getCurrentMembership } from "@/lib/auth/rbac";
import { can } from "@/lib/auth/roles";
import {
  propertyObjectFolder,
  uploadImage,
} from "@/lib/storage/cloudinary";
import {
  imageValidationMessage,
  isValidImageType,
  MAX_IMAGE_BYTES,
} from "@/lib/validations/media";

export const runtime = "nodejs";

/**
 * Upload guest ID photos to Cloudinary private ("authenticated") storage
 * under the property-isolated folder `id-docs/properties/{propertyId}/guests`.
 *
 * Restricted to Owner, Manager, and Receptionist (spec §3/§8/§10).
 */
export async function POST(request: Request) {
  const membership = await getCurrentMembership();
  if (!membership || !can(membership.role, "booking:manage")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: only staff may upload ID documents" },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No image file provided" },
        { status: 400 },
      );
    }

    const validationErr = imageValidationMessage(file);
    if (validationErr) {
      return NextResponse.json(
        { ok: false, error: validationErr },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_BYTES || !isValidImageType(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Invalid image file format or size exceeds 5MB" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const folder = propertyObjectFolder(membership.property.id, "guests");
    const uploaded = await uploadImage(buffer, {
      folder,
      access: "authenticated",
    });

    return NextResponse.json({
      ok: true,
      publicId: uploaded.publicId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload ID photo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
