"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { propertyMembers, users } from "@/lib/db/schema";
import { requireMembership } from "@/lib/auth/rbac";
import {
  clerkErrorMessage,
  inviteToPropertyOrg,
  removePropertyOrgMember,
  revokePropertyInvitation,
} from "@/lib/auth/clerk-org";
import type { ActionResult } from "@/lib/action-result";
import { inviteStaffSchema } from "@/lib/validations/property";

/**
 * Invite a staff member to the active property by email + app role. Owner only
 * (spec §3 - wait, updated to owner only per request). The Clerk invitation carries
 * the app role in publicMetadata; the `organizationMembership.created` webhook writes the
 * authoritative `property_members` row once the invitee accepts.
 */
export async function inviteStaff(input: unknown): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner"]);
  } catch {
    return { ok: false, error: "You don't have permission to invite staff (owner only)." };
  }

  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the details.",
    };
  }

  const { property, user } = membership;
  if (!property.clerkOrgId) {
    return { ok: false, error: "This property has no organization yet." };
  }

  try {
    await inviteToPropertyOrg({
      organizationId: property.clerkOrgId,
      email: parsed.data.email,
      inviterClerkUserId: user.clerkUserId,
      appRole: parsed.data.role,
    });
  } catch (err) {
    console.error("[inviteStaff] failed", err);
    return {
      ok: false,
      error: clerkErrorMessage(err) ?? "Could not send the invitation.",
    };
  }

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Remove a member from the active property. Owner or manager only. The target
 * is looked up by membership id and must belong to THIS property (tenant
 * isolation). Owners can't be removed here — delete the property instead.
 */
export async function removeStaff(input: {
  membershipId?: string;
}): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch {
    return { ok: false, error: "You don't have permission to remove staff." };
  }

  const membershipId =
    typeof input?.membershipId === "string" ? input.membershipId : "";
  if (!membershipId) return { ok: false, error: "Missing member." };

  const { property } = membership;
  const [target] = await db
    .select({
      id: propertyMembers.id,
      role: propertyMembers.role,
      clerkUserId: users.clerkUserId,
    })
    .from(propertyMembers)
    .innerJoin(users, eq(users.id, propertyMembers.userId))
    .where(
      and(
        eq(propertyMembers.id, membershipId),
        eq(propertyMembers.propertyId, property.id),
      ),
    )
    .limit(1);

  if (!target) {
    return { ok: false, error: "That member isn't part of this property." };
  }
  if (target.role === "owner") {
    return {
      ok: false,
      error: "The owner can't be removed. Delete the property instead.",
    };
  }

  // Removing the Clerk org membership also fires a webhook that deletes the
  // same row — both paths are idempotent. Remove from our DB regardless so the
  // UI is correct even without a configured webhook.
  if (property.clerkOrgId) {
    try {
      await removePropertyOrgMember({
        organizationId: property.clerkOrgId,
        clerkUserId: target.clerkUserId,
      });
    } catch (err) {
      console.error("[removeStaff] org removal failed", err);
    }
  }
  await db.delete(propertyMembers).where(eq(propertyMembers.id, target.id));

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Revoke a still-pending invitation. Owner or manager only. Clerk enforces that
 * the invitation belongs to this property's org (we pass its org id), so a
 * caller can't revoke another property's invitation.
 */
export async function revokeInvitation(input: {
  invitationId?: string;
}): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const invitationId =
    typeof input?.invitationId === "string" ? input.invitationId : "";
  const { property, user } = membership;
  if (!invitationId || !property.clerkOrgId) {
    return { ok: false, error: "Missing invitation." };
  }

  try {
    await revokePropertyInvitation({
      organizationId: property.clerkOrgId,
      invitationId,
      requestingClerkUserId: user.clerkUserId,
    });
  } catch (err) {
    console.error("[revokeInvitation] failed", err);
    return {
      ok: false,
      error: clerkErrorMessage(err) ?? "Could not revoke the invitation.",
    };
  }

  revalidatePath("/settings");
  return { ok: true };
}
