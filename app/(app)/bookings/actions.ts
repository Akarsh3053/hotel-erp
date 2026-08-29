"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  bookings,
  checklistTemplateItems,
  checklistTemplates,
  guests,
  housekeepingTaskItems,
  housekeepingTasks,
  rooms,
} from "@/lib/db/schema";
import { requireMembership } from "@/lib/auth/rbac";
import type { ActionResult } from "@/lib/action-result";
import {
  checkInReservationSchema,
  checkInWalkInSchema,
  createReservationSchema,
} from "@/lib/validations/booking";

/* ---------------------------------------------------------------------------
 * Advance Reservation Creation (spec §7/§9)
 * ------------------------------------------------------------------------- */
export async function createReservation(
  input: unknown,
): Promise<ActionResult<{ bookingId: string }>> {
  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid reservation details",
    };
  }

  let membership;
  try {
    const propertyId = await getRoomPropertyId(parsed.data.roomId);
    if (!propertyId) {
      return { ok: false, error: "Room not found" };
    }
    membership = await requireMembership(["owner", "manager", "receptionist"]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "You are not authorized.";
    return { ok: false, error: message };
  }

  const { property, user } = membership;

  // Verify the room belongs to this property
  const [room] = await db
    .select({ id: rooms.id, status: rooms.status })
    .from(rooms)
    .where(and(eq(rooms.id, parsed.data.roomId), eq(rooms.propertyId, property.id)))
    .limit(1);

  if (!room) {
    return { ok: false, error: "Selected room not found in this property" };
  }

  const checkInDate = new Date(parsed.data.scheduledCheckInAt);
  const checkOutDate = new Date(
    checkInDate.getTime() + parsed.data.durationNights * 24 * 60 * 60 * 1000,
  );

  try {
    const [booking] = await db
      .insert(bookings)
      .values({
        propertyId: property.id,
        roomId: room.id,
        status: "reserved",
        bookingType: parsed.data.bookingType,
        totalPrice: parsed.data.totalPrice !== undefined && parsed.data.totalPrice !== null ? String(parsed.data.totalPrice) : null,
        scheduledCheckInAt: checkInDate,
        scheduledCheckOutAt: parsed.data.scheduledCheckOutAt ? new Date(parsed.data.scheduledCheckOutAt) : checkOutDate,
        adultCount: parsed.data.adultCount,
        childCount: parsed.data.childCount,
        createdBy: user.id,
      })
      .returning({ id: bookings.id });

    // Store the primary guest record
    await db.insert(guests).values({
      bookingId: booking.id,
      guestType: "adult",
      name: parsed.data.primaryGuestName,
      contact: parsed.data.primaryGuestContact,
      isPrimary: true,
    });

    // Mark room as reserved if it is currently available
    if (room.status === "available") {
      await db
        .update(rooms)
        .set({ status: "reserved", updatedAt: new Date() })
        .where(eq(rooms.id, room.id));
    }

    revalidatePath("/bookings");
    revalidatePath("/rooms");
    revalidatePath("/");

    return { ok: true, bookingId: booking.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create reservation";
    return { ok: false, error: message };
  }
}

/* ---------------------------------------------------------------------------
 * Walk-in Check-in (spec §7/§8)
 * ------------------------------------------------------------------------- */
export async function checkInWalkIn(
  input: unknown,
): Promise<ActionResult<{ bookingId: string }>> {
  const parsed = checkInWalkInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid check-in details",
    };
  }

  let membership;
  try {
    const propertyId = await getRoomPropertyId(parsed.data.roomId);
    if (!propertyId) {
      return { ok: false, error: "Room not found" };
    }
    membership = await requireMembership(["owner", "manager", "receptionist"]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "You are not authorized.";
    return { ok: false, error: message };
  }

  const { property, user } = membership;

  // Verify room is available in this property
  const [room] = await db
    .select({ id: rooms.id, status: rooms.status })
    .from(rooms)
    .where(and(eq(rooms.id, parsed.data.roomId), eq(rooms.propertyId, property.id)))
    .limit(1);

  if (!room) {
    return { ok: false, error: "Room not found in this property" };
  }

  if (room.status === "occupied") {
    return {
      ok: false,
      error: "This room is currently occupied. Please select an available room.",
    };
  }

  const now = new Date();
  const checkOutDate = new Date(
    now.getTime() + parsed.data.durationNights * 24 * 60 * 60 * 1000,
  );

  try {
    const [booking] = await db
      .insert(bookings)
      .values({
        propertyId: property.id,
        roomId: room.id,
        status: "checked_in",
        bookingType: parsed.data.bookingType,
        totalPrice: parsed.data.totalPrice !== undefined && parsed.data.totalPrice !== null ? String(parsed.data.totalPrice) : null,
        scheduledCheckInAt: now,
        scheduledCheckOutAt: parsed.data.scheduledCheckOutAt ? new Date(parsed.data.scheduledCheckOutAt) : checkOutDate,
        actualCheckInAt: now,
        adultCount: parsed.data.adultCount,
        childCount: parsed.data.childCount,
        createdBy: user.id,
      })
      .returning({ id: bookings.id });

    // Insert adult guests
    for (const adult of parsed.data.adults) {
      await db.insert(guests).values({
        bookingId: booking.id,
        guestType: "adult",
        name: adult.name,
        address: adult.address,
        gender: adult.gender,
        age: adult.age,
        contact: adult.contact,
        idPhotoFrontUrl: adult.idPhotoFront ?? null,
        idPhotoBackUrl: adult.idPhotoBack ?? null,
        isPrimary: adult.isPrimary,
      });
    }

    // Insert child guests
    for (const child of parsed.data.children) {
      await db.insert(guests).values({
        bookingId: booking.id,
        guestType: "child",
        name: child.name,
        gender: child.gender,
        age: child.age,
        isPrimary: false,
      });
    }

    // Move room to occupied status
    await db
      .update(rooms)
      .set({ status: "occupied", updatedAt: new Date() })
      .where(eq(rooms.id, room.id));

    revalidatePath("/bookings");
    revalidatePath("/rooms");
    revalidatePath("/");

    return { ok: true, bookingId: booking.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to complete walk-in check-in";
    return { ok: false, error: message };
  }
}

/* ---------------------------------------------------------------------------
 * Check-in for an Existing Reservation (spec §7/§8)
 * ------------------------------------------------------------------------- */
export async function checkInReservation(
  input: unknown,
): Promise<ActionResult> {
  const parsed = checkInReservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid check-in details",
    };
  }

  let membership;
  try {
    const propertyId = await getBookingPropertyId(parsed.data.bookingId);
    if (!propertyId) {
      return { ok: false, error: "Booking not found" };
    }
    membership = await requireMembership(["owner", "manager", "receptionist"]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "You are not authorized.";
    return { ok: false, error: message };
  }

  const { property } = membership;

  const [booking] = await db
    .select({
      id: bookings.id,
      roomId: bookings.roomId,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.propertyId, property.id),
      ),
    )
    .limit(1);

  if (!booking) {
    return { ok: false, error: "Booking not found in this property" };
  }

  if (booking.status !== "reserved") {
    return {
      ok: false,
      error: `Cannot check in booking with status: ${booking.status}`,
    };
  }

  const now = new Date();

  try {
    // Delete preliminary guest records and insert the verified list
    await db.delete(guests).where(eq(guests.bookingId, booking.id));

    for (const adult of parsed.data.adults) {
      await db.insert(guests).values({
        bookingId: booking.id,
        guestType: "adult",
        name: adult.name,
        address: adult.address,
        gender: adult.gender,
        age: adult.age,
        contact: adult.contact,
        idPhotoFrontUrl: adult.idPhotoFront ?? null,
        idPhotoBackUrl: adult.idPhotoBack ?? null,
        isPrimary: adult.isPrimary,
      });
    }

    for (const child of parsed.data.children) {
      await db.insert(guests).values({
        bookingId: booking.id,
        guestType: "child",
        name: child.name,
        gender: child.gender,
        age: child.age,
        isPrimary: false,
      });
    }

    // Update booking status
    await db
      .update(bookings)
      .set({
        status: "checked_in",
        actualCheckInAt: now,
        adultCount: parsed.data.adultCount,
        childCount: parsed.data.childCount,
        updatedAt: now,
      })
      .where(eq(bookings.id, booking.id));

    // Update room to occupied
    await db
      .update(rooms)
      .set({ status: "occupied", updatedAt: now })
      .where(eq(rooms.id, booking.roomId));

    revalidatePath("/bookings");
    revalidatePath("/rooms");
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check in reservation";
    return { ok: false, error: message };
  }
}

/* ---------------------------------------------------------------------------
 * Check-out (spec §6/§7 #5: Occupied -> Housekeeping & auto-create task)
 * ------------------------------------------------------------------------- */
export async function checkOutBooking(
  bookingId: string,
): Promise<ActionResult> {
  let membership;
  try {
    const propertyId = await getBookingPropertyId(bookingId);
    if (!propertyId) {
      return { ok: false, error: "Booking not found" };
    }
    membership = await requireMembership(["owner", "manager", "receptionist"]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "You are not authorized.";
    return { ok: false, error: message };
  }

  const { property } = membership;

  const [booking] = await db
    .select({
      id: bookings.id,
      roomId: bookings.roomId,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.propertyId, property.id)),
    )
    .limit(1);

  if (!booking) {
    return { ok: false, error: "Booking not found in this property" };
  }

  if (booking.status !== "checked_in") {
    return {
      ok: false,
      error: `Cannot check out booking with status: ${booking.status}`,
    };
  }

  const now = new Date();

  try {
    // 1. Mark booking as checked_out
    await db
      .update(bookings)
      .set({
        status: "checked_out",
        actualCheckOutAt: now,
        updatedAt: now,
      })
      .where(eq(bookings.id, booking.id));

    // 2. Transition room status to housekeeping
    await db
      .update(rooms)
      .set({ status: "housekeeping", updatedAt: now })
      .where(eq(rooms.id, booking.roomId));

    // 3. Find room's roomType to find default checklist template
    const [room] = await db
      .select({ roomTypeId: rooms.roomTypeId })
      .from(rooms)
      .where(eq(rooms.id, booking.roomId))
      .limit(1);

    let templateId: string | null = null;
    if (room) {
      // Find template marked as default for this room type
      const [defaultTemplate] = await db
        .select({ id: checklistTemplates.id })
        .from(checklistTemplates)
        .where(
          and(
            eq(checklistTemplates.propertyId, property.id),
            eq(checklistTemplates.defaultForRoomTypeId, room.roomTypeId),
          ),
        )
        .limit(1);

      if (defaultTemplate) {
        templateId = defaultTemplate.id;
      } else {
        // Fall back to any template in property
        const [anyTemplate] = await db
          .select({ id: checklistTemplates.id })
          .from(checklistTemplates)
          .where(eq(checklistTemplates.propertyId, property.id))
          .limit(1);
        if (anyTemplate) {
          templateId = anyTemplate.id;
        }
      }
    }

    // 4. Create housekeeping task (spec §7 #5)
    const [task] = await db
      .insert(housekeepingTasks)
      .values({
        propertyId: property.id,
        roomId: booking.roomId,
        bookingId: booking.id,
        checklistTemplateId: templateId,
        status: "assigned",
      })
      .returning({ id: housekeepingTasks.id });

    // 5. Populate task items if a checklist template is present
    if (templateId) {
      const templateItems = await db
        .select({ id: checklistTemplateItems.id, label: checklistTemplateItems.label })
        .from(checklistTemplateItems)
        .where(eq(checklistTemplateItems.templateId, templateId))
        .orderBy(checklistTemplateItems.sortOrder);

      for (const item of templateItems) {
        await db.insert(housekeepingTaskItems).values({
          taskId: task.id,
          templateItemId: item.id,
          label: item.label,
          isCompleted: false,
        });
      }
    }

    revalidatePath("/bookings");
    revalidatePath("/rooms");
    revalidatePath("/housekeeping");
    revalidatePath("/tasks");
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to complete checkout";
    return { ok: false, error: message };
  }
}

/* ---------------------------------------------------------------------------
 * Cancel Reservation (spec §6: Reserved -> Available)
 * ------------------------------------------------------------------------- */
export async function cancelBooking(
  bookingId: string,
): Promise<ActionResult> {
  let membership;
  try {
    const propertyId = await getBookingPropertyId(bookingId);
    if (!propertyId) {
      return { ok: false, error: "Booking not found" };
    }
    membership = await requireMembership(["owner", "manager", "receptionist"]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "You are not authorized.";
    return { ok: false, error: message };
  }

  const { property } = membership;

  const [booking] = await db
    .select({
      id: bookings.id,
      roomId: bookings.roomId,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.propertyId, property.id)),
    )
    .limit(1);

  if (!booking) {
    return { ok: false, error: "Booking not found in this property" };
  }

  if (booking.status !== "reserved") {
    return {
      ok: false,
      error: `Only reservations with status "reserved" can be cancelled (current: ${booking.status}).`,
    };
  }

  const now = new Date();

  try {
    // 1. Mark booking as cancelled
    await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: now })
      .where(eq(bookings.id, booking.id));

    // 2. Return room to available if it was reserved
    const [room] = await db
      .select({ status: rooms.status })
      .from(rooms)
      .where(eq(rooms.id, booking.roomId))
      .limit(1);

    if (room && room.status === "reserved") {
      await db
        .update(rooms)
        .set({ status: "available", updatedAt: now })
        .where(eq(rooms.id, booking.roomId));
    }

    revalidatePath("/bookings");
    revalidatePath("/rooms");
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel reservation";
    return { ok: false, error: message };
  }
}

/* ---------------------------------------------------------------------------
 * Internal helpers
 * ------------------------------------------------------------------------- */
async function getRoomPropertyId(roomId: string): Promise<string | null> {
  const [row] = await db
    .select({ propertyId: rooms.propertyId })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  return row?.propertyId ?? null;
}

async function getBookingPropertyId(
  bookingId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ propertyId: bookings.propertyId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  return row?.propertyId ?? null;
}
