"use server";

import { revalidatePath } from "next/cache";
import { and, eq, count } from "drizzle-orm";

import { db } from "@/lib/db";
import { rooms, roomTypes } from "@/lib/db/schema";
import { requireMembership } from "@/lib/auth/rbac";
import type { ActionResult } from "@/lib/action-result";
import {
  createRoomSchema,
  createRoomTypeSchema,
  updateRoomSchema,
  updateRoomStatusSchema,
  updateRoomTypeSchema,
} from "@/lib/validations/room";

function orNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v && v.length > 0 ? v : null;
}

/* ---------------------------------------------------------------------------
 * Room Types CRUD (Owner & Manager)
 * ------------------------------------------------------------------------- */

export async function createRoomType(input: unknown): Promise<ActionResult<{ roomTypeId: string }>> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch {
    return { ok: false, error: "You don't have permission to manage room types." };
  }

  const parsed = createRoomTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the details.",
    };
  }

  const { name, description, displayPrice, maxOccupancy } = parsed.data;

  try {
    const [created] = await db
      .insert(roomTypes)
      .values({
        propertyId: membership.property.id,
        name,
        description: orNull(description),
        displayPrice: displayPrice != null ? String(displayPrice) : null,
        maxOccupancy: maxOccupancy ?? null,
      })
      .returning({ id: roomTypes.id });

    revalidatePath("/rooms");
    return { ok: true, roomTypeId: created.id };
  } catch (err) {
    console.error("[createRoomType] failed", err);
    return { ok: false, error: "Could not create room type. Try again." };
  }
}

export async function updateRoomType(
  roomTypeId: string,
  input: unknown,
): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch {
    return { ok: false, error: "You don't have permission to manage room types." };
  }

  const parsed = updateRoomTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the details.",
    };
  }

  const { name, description, displayPrice, maxOccupancy } = parsed.data;

  try {
    const result = await db
      .update(roomTypes)
      .set({
        name,
        description: orNull(description),
        displayPrice: displayPrice != null ? String(displayPrice) : null,
        maxOccupancy: maxOccupancy ?? null,
      })
      .where(
        and(
          eq(roomTypes.id, roomTypeId),
          eq(roomTypes.propertyId, membership.property.id),
        ),
      )
      .returning({ id: roomTypes.id });

    if (!result.length) {
      return { ok: false, error: "Room type not found in this property." };
    }

    revalidatePath("/rooms");
    return { ok: true };
  } catch (err) {
    console.error("[updateRoomType] failed", err);
    return { ok: false, error: "Could not update room type. Try again." };
  }
}

export async function deleteRoomType(roomTypeId: string): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch {
    return { ok: false, error: "You don't have permission to delete room types." };
  }

  // Check if any rooms are assigned to this room type
  const [assignedCount] = await db
    .select({ count: count() })
    .from(rooms)
    .where(
      and(
        eq(rooms.roomTypeId, roomTypeId),
        eq(rooms.propertyId, membership.property.id),
      ),
    );

  if (Number(assignedCount?.count ?? 0) > 0) {
    return {
      ok: false,
      error: `Cannot delete: ${assignedCount.count} room(s) are currently assigned to this room type.`,
    };
  }

  try {
    const result = await db
      .delete(roomTypes)
      .where(
        and(
          eq(roomTypes.id, roomTypeId),
          eq(roomTypes.propertyId, membership.property.id),
        ),
      )
      .returning({ id: roomTypes.id });

    if (!result.length) {
      return { ok: false, error: "Room type not found." };
    }

    revalidatePath("/rooms");
    return { ok: true };
  } catch (err) {
    console.error("[deleteRoomType] failed", err);
    return { ok: false, error: "Could not delete room type. Try again." };
  }
}

/* ---------------------------------------------------------------------------
 * Rooms CRUD (Owner & Manager)
 * ------------------------------------------------------------------------- */

export async function createRoom(input: unknown): Promise<ActionResult<{ roomId: string }>> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch {
    return { ok: false, error: "You don't have permission to create rooms." };
  }

  const parsed = createRoomSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the details.",
    };
  }

  const { roomNumber, floor, roomTypeId, status } = parsed.data;

  // Validate roomTypeId belongs to this property
  const [typeExists] = await db
    .select({ id: roomTypes.id })
    .from(roomTypes)
    .where(
      and(
        eq(roomTypes.id, roomTypeId),
        eq(roomTypes.propertyId, membership.property.id),
      ),
    )
    .limit(1);

  if (!typeExists) {
    return { ok: false, error: "Selected room type does not belong to this property." };
  }

  try {
    const [created] = await db
      .insert(rooms)
      .values({
        propertyId: membership.property.id,
        roomTypeId,
        roomNumber,
        floor: orNull(floor),
        status,
      })
      .returning({ id: rooms.id });

    revalidatePath("/rooms");
    revalidatePath("/");
    return { ok: true, roomId: created.id };
  } catch (err: unknown) {
    // Unique constraint violation (duplicate room number in same property)
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return { ok: false, error: `Room ${roomNumber} already exists in this property.` };
    }
    console.error("[createRoom] failed", err);
    return { ok: false, error: "Could not create room. Try again." };
  }
}

export async function updateRoom(
  roomId: string,
  input: unknown,
): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch {
    return { ok: false, error: "You don't have permission to edit rooms." };
  }

  const parsed = updateRoomSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the details.",
    };
  }

  const { roomNumber, floor, roomTypeId, status } = parsed.data;

  // Validate roomTypeId belongs to this property
  const [typeExists] = await db
    .select({ id: roomTypes.id })
    .from(roomTypes)
    .where(
      and(
        eq(roomTypes.id, roomTypeId),
        eq(roomTypes.propertyId, membership.property.id),
      ),
    )
    .limit(1);

  if (!typeExists) {
    return { ok: false, error: "Selected room type does not belong to this property." };
  }

  try {
    const result = await db
      .update(rooms)
      .set({
        roomNumber,
        floor: orNull(floor),
        roomTypeId,
        status,
      })
      .where(
        and(
          eq(rooms.id, roomId),
          eq(rooms.propertyId, membership.property.id),
        ),
      )
      .returning({ id: rooms.id });

    if (!result.length) {
      return { ok: false, error: "Room not found in this property." };
    }

    revalidatePath("/rooms");
    revalidatePath("/");
    return { ok: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return { ok: false, error: `Room ${roomNumber} already exists in this property.` };
    }
    console.error("[updateRoom] failed", err);
    return { ok: false, error: "Could not update room. Try again." };
  }
}

export async function deleteRoom(roomId: string): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch {
    return { ok: false, error: "You don't have permission to delete rooms." };
  }

  try {
    const result = await db
      .delete(rooms)
      .where(
        and(
          eq(rooms.id, roomId),
          eq(rooms.propertyId, membership.property.id),
        ),
      )
      .returning({ id: rooms.id });

    if (!result.length) {
      return { ok: false, error: "Room not found." };
    }

    revalidatePath("/rooms");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[deleteRoom] failed", err);
    return { ok: false, error: "Could not delete room. Try again." };
  }
}

/* ---------------------------------------------------------------------------
 * Quick Room Status update (Receptionist, Manager, Owner)
 * ------------------------------------------------------------------------- */

export async function updateRoomStatus(
  input: unknown,
): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager", "receptionist"]);
  } catch {
    return { ok: false, error: "You don't have permission to change room status." };
  }

  const parsed = updateRoomStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid status.",
    };
  }

  const { roomId, status } = parsed.data;

  try {
    const result = await db
      .update(rooms)
      .set({ status })
      .where(
        and(
          eq(rooms.id, roomId),
          eq(rooms.propertyId, membership.property.id),
        ),
      )
      .returning({ id: rooms.id });

    if (!result.length) {
      return { ok: false, error: "Room not found." };
    }

    revalidatePath("/rooms");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[updateRoomStatus] failed", err);
    return { ok: false, error: "Could not change room status. Try again." };
  }
}
