import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { InvitableRole } from "@/lib/validations/property";

/**
 * Clerk backend helpers for the "one Organization per Property" model (spec §4).
 *
 * Two things to know about this Clerk version:
 *  - `clerkClient()` is async — always `await` it before touching `.organizations`.
 *  - We keep the Clerk org role as the default `org:member` and carry our
 *    fine-grained app role (owner/manager/receptionist/cleaner) in the
 *    invitation's `publicMetadata.appRole`. On acceptance, Clerk copies that
 *    into the user's public metadata and fires `organizationMembership.created`,
 *    which the webhook uses to write the authoritative `property_members` row.
 *    This avoids requiring custom org roles to be configured in the Clerk
 *    dashboard.
 */

/** Clerk publicMetadata key carrying the app role through an invitation. */
export const APP_ROLE_METADATA_KEY = "appRole";

/** Default Clerk org role for every invited member (app role lives in metadata). */
const DEFAULT_ORG_ROLE = "org:member";

/**
 * Create a Clerk Organization for a new property. The creating user becomes a
 * Clerk org admin; their authoritative app role ("owner") is written to
 * `property_members` by the caller.
 */
export async function createPropertyOrg(opts: {
  name: string;
  createdByClerkUserId: string;
}) {
  const client = await clerkClient();
  return client.organizations.createOrganization({
    name: opts.name,
    createdBy: opts.createdByClerkUserId,
  });
}

/** Permanently delete a property's Clerk Organization. */
export async function deletePropertyOrg(organizationId: string) {
  const client = await clerkClient();
  return client.organizations.deleteOrganization(organizationId);
}

/** Invite a user to a property's org, tagging the app role in publicMetadata. */
export async function inviteToPropertyOrg(opts: {
  organizationId: string;
  email: string;
  inviterClerkUserId: string;
  appRole: InvitableRole;
}) {
  const client = await clerkClient();
  return client.organizations.createOrganizationInvitation({
    organizationId: opts.organizationId,
    emailAddress: opts.email,
    inviterUserId: opts.inviterClerkUserId,
    role: DEFAULT_ORG_ROLE,
    publicMetadata: { [APP_ROLE_METADATA_KEY]: opts.appRole },
  });
}

/** Pending (not yet accepted/revoked) invitations for a property's org. */
export async function listPendingInvitations(organizationId: string) {
  const client = await clerkClient();
  const res = await client.organizations.getOrganizationInvitationList({
    organizationId,
    status: ["pending"],
  });
  return res.data;
}

/** Revoke a still-pending invitation. */
export async function revokePropertyInvitation(opts: {
  organizationId: string;
  invitationId: string;
  requestingClerkUserId: string;
}) {
  const client = await clerkClient();
  return client.organizations.revokeOrganizationInvitation({
    organizationId: opts.organizationId,
    invitationId: opts.invitationId,
    requestingUserId: opts.requestingClerkUserId,
  });
}

/** Remove an accepted member from a property's org. */
export async function removePropertyOrgMember(opts: {
  organizationId: string;
  clerkUserId: string;
}) {
  const client = await clerkClient();
  return client.organizations.deleteOrganizationMembership({
    organizationId: opts.organizationId,
    userId: opts.clerkUserId,
  });
}

/** Read the app role tagged on an invitation/user publicMetadata, if present. */
export function appRoleFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const value = metadata?.[APP_ROLE_METADATA_KEY];
  return typeof value === "string" ? value : null;
}

/**
 * Extract a user-presentable message from a Clerk backend error (e.g. "already
 * a member", "already invited"), falling back to null so the caller can supply
 * a generic message.
 */
export function clerkErrorMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = (err as { errors?: unknown }).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0] as { longMessage?: string; message?: string };
      return first.longMessage ?? first.message ?? null;
    }
  }
  return null;
}
