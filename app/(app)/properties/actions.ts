"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { properties, propertyMembers } from "@/lib/db/schema";
import { ensureCurrentUser, requireMembership } from "@/lib/auth/rbac";
import { createPropertyOrg, deletePropertyOrg } from "@/lib/auth/clerk-org";
import type { ActionResult } from "@/lib/action-result";
import {
  createPropertySchema,
  updatePropertySchema,
} from "@/lib/validations/property";

/** Trim optional free text to null so the DB stores absence, not "". */
function orNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v && v.length > 0 ? v : null;
}

/**
 * Create a property: provisions its Clerk Organization (tenancy boundary), then
 * persists the `properties` row and the creator's `owner` membership. Any
 * signed-in user may create a property and becomes its owner.
 *
 * The client activates the returned org (`setActive`) and navigates. Neon's
 * HTTP driver has no interactive transactions, so the two inserts run
 * sequentially and we best-effort delete the org if persistence fails.
 */
export async function createProperty(
  input: unknown,
): Promise<ActionResult<{ organizationId: string }>> {
  const user = await ensureCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const parsed = createPropertySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the details.",
    };
  }
  const { name, address, totalRooms } = parsed.data;

  let organizationId: string;
  try {
    const org = await createPropertyOrg({
      name,
      createdByClerkUserId: user.clerkUserId,
    });
    organizationId = org.id;
  } catch (err) {
    console.error("[createProperty] Clerk org creation failed", err);
    return { ok: false, error: "Could not create the property. Try again." };
  }

  try {
    const [property] = await db
      .insert(properties)
      .values({
        clerkOrgId: organizationId,
        ownerUserId: user.id,
        name,
        address: orNull(address),
        totalRooms: totalRooms ?? null,
      })
      .returning();

    await db
      .insert(propertyMembers)
      .values({ propertyId: property.id, userId: user.id, role: "owner" })
      .onConflictDoNothing();

    revalidatePath("/");
    revalidatePath("/settings");
    return { ok: true, organizationId };
  } catch (err) {
    console.error("[createProperty] persistence failed; rolling back org", err);
    await deletePropertyOrg(organizationId).catch(() => {});
    return { ok: false, error: "Could not save the property. Try again." };
  }
}

/** Edit the active property's details. Owner only (spec §3). */
export async function updateProperty(input: unknown): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner"]);
  } catch {
    return {
      ok: false,
      error: "You don't have permission to edit this property.",
    };
  }

  const parsed = updatePropertySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the details.",
    };
  }
  const { name, address, totalRooms } = parsed.data;

  await db
    .update(properties)
    .set({ name, address: orNull(address), totalRooms: totalRooms ?? null })
    .where(eq(properties.id, membership.property.id));

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Permanently delete the active property. Owner only. Deletes the Clerk org
 * first; the DB foreign-key cascade removes members, rooms, bookings, etc. The
 * client should clear the active org and navigate home afterward.
 */
export async function deleteProperty(): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner"]);
  } catch {
    return { ok: false, error: "Only the owner can delete this property." };
  }
  const { property } = membership;

  if (property.clerkOrgId) {
    try {
      await deletePropertyOrg(property.clerkOrgId);
    } catch (err) {
      console.error("[deleteProperty] org deletion failed", err);
      return { ok: false, error: "Could not delete the property. Try again." };
    }
  }

  await db.delete(properties).where(eq(properties.id, property.id));
  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}
