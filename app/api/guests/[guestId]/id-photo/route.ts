import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getCurrentMembership } from "@/lib/auth/rbac";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { bookings, guests } from "@/lib/db/schema";
import { getSignedImageUrl } from "@/lib/storage/cloudinary";

export const runtime = "nodejs";

/**
 * Mint a signed delivery URL for a guest ID photo (spec §10).
 *
 * Only accessible by Owner, Manager, and Receptionist within the same property.
 * Cleaners are strictly denied access to guest PII.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ guestId: string }> },
) {
  const membership = await getCurrentMembership();
  if (!membership || !can(membership.role, "booking:manage")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const { guestId } = await context.params;
  const side = request.nextUrl.searchParams.get("side") ?? "front";

  const [row] = await db
    .select({
      id: guests.id,
      idPhotoFrontUrl: guests.idPhotoFrontUrl,
      idPhotoBackUrl: guests.idPhotoBackUrl,
      propertyId: bookings.propertyId,
    })
    .from(guests)
    .innerJoin(bookings, eq(guests.bookingId, bookings.id))
    .where(
      and(
        eq(guests.id, guestId),
        eq(bookings.propertyId, membership.property.id),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Guest not found in this property" },
      { status: 404 },
    );
  }

  const publicId =
    side === "back" ? row.idPhotoBackUrl : row.idPhotoFrontUrl;

  if (!publicId) {
    return NextResponse.json(
      { ok: false, error: "No photo uploaded for this side" },
      { status: 404 },
    );
  }

  const signedUrl = getSignedImageUrl(publicId, { access: "authenticated" });

  return NextResponse.json({
    ok: true,
    url: signedUrl,
  });
}
