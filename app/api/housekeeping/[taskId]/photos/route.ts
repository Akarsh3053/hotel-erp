import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentMembership } from "@/lib/auth/rbac";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { housekeepingTaskPhotos, housekeepingTasks } from "@/lib/db/schema";
import {
  uploadImage,
  propertyObjectFolder,
  getSignedImageUrl,
} from "@/lib/storage/cloudinary";

export const runtime = "nodejs";

/**
 * POST /api/housekeeping/:taskId/photos
 * Upload a proof photo for a housekeeping task (cleaner only).
 * Proof photos are NOT PII — stored as Cloudinary public assets.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const membership = await getCurrentMembership();
  if (!membership || !can(membership.role, "housekeeping:complete")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const { taskId } = await context.params;

  // Verify the task belongs to this property and this cleaner
  const [task] = await db
    .select({
      id: housekeepingTasks.id,
      propertyId: housekeepingTasks.propertyId,
      assignedCleanerId: housekeepingTasks.assignedCleanerId,
      status: housekeepingTasks.status,
    })
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, taskId))
    .limit(1);

  if (!task || task.propertyId !== membership.property.id) {
    return NextResponse.json(
      { ok: false, error: "Task not found in this property" },
      { status: 404 },
    );
  }

  if (task.assignedCleanerId !== membership.user.id) {
    return NextResponse.json(
      { ok: false, error: "You are not assigned to this task" },
      { status: 403 },
    );
  }

  if (task.status !== "in_progress" && task.status !== "assigned") {
    return NextResponse.json(
      { ok: false, error: "Task is not in progress" },
      { status: 400 },
    );
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = propertyObjectFolder(membership.property.id, "housekeeping");
  const uploaded = await uploadImage(buffer, { folder, access: "public" });

  await db.insert(housekeepingTaskPhotos).values({
    taskId: task.id,
    photoUrl: uploaded.publicId,
  });

  const url = getSignedImageUrl(uploaded.publicId, { access: "public" });

  return NextResponse.json({ ok: true, publicId: uploaded.publicId, url });
}
