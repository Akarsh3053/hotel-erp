import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { properties, propertyMembers, users } from "@/lib/db/schema";

import type { Role } from "./roles";

export type Membership = {
  user: typeof users.$inferSelect;
  property: typeof properties.$inferSelect;
  role: Role;
};

/**
 * The local `users` row for the signed-in Clerk user, or null.
 * (The row is created/updated by the Clerk webhook — see
 * `app/api/webhooks/clerk/route.ts`.)
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Like `getCurrentUser`, but upserts the local `users` row from Clerk if it
 * doesn't exist yet. Call this from mutations that need a guaranteed local
 * user (e.g. creating a property) so the first-run owner flow works even before
 * the Clerk webhook has synced the user — which, in local dev, needs a public
 * tunnel that may not be configured. Returns null only when signed out.
 */
export async function ensureCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const cu = await currentUser();
  const email = cu
    ? (cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)
        ?.emailAddress ??
      cu.emailAddresses[0]?.emailAddress ??
      null)
    : null;

  const values = {
    clerkUserId: userId,
    email,
    firstName: cu?.firstName ?? null,
    lastName: cu?.lastName ?? null,
    imageUrl: cu?.imageUrl ?? null,
  };

  const [row] = await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        imageUrl: values.imageUrl,
      },
    })
    .returning();
  return row ?? null;
}

/**
 * Resolves the caller's membership for the *active* property (Clerk org).
 *
 * Returns null when there is no active organization yet (e.g. a freshly
 * signed-up user who hasn't created/joined a property). Short-circuits before
 * touching the database in that case, so the app shell renders even before any
 * property exists.
 */
export async function getCurrentMembership(): Promise<Membership | null> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;

  const [row] = await db
    .select({
      user: users,
      property: properties,
      role: propertyMembers.role,
    })
    .from(propertyMembers)
    .innerJoin(users, eq(users.id, propertyMembers.userId))
    .innerJoin(properties, eq(properties.id, propertyMembers.propertyId))
    .where(
      and(eq(users.clerkUserId, userId), eq(properties.clerkOrgId, orgId)),
    )
    .limit(1);

  if (!row) return null;
  return { user: row.user, property: row.property, role: row.role };
}

/**
 * Every property the signed-in user belongs to, with their role in each.
 * Powers the property switcher (a user may own/work at several properties).
 * Returns [] when signed out.
 */
export async function listMembershipsForCurrentUser(): Promise<
  Array<{ property: typeof properties.$inferSelect; role: Role }>
> {
  const { userId } = await auth();
  if (!userId) return [];
  return db
    .select({ property: properties, role: propertyMembers.role })
    .from(propertyMembers)
    .innerJoin(users, eq(users.id, propertyMembers.userId))
    .innerJoin(properties, eq(properties.id, propertyMembers.propertyId))
    .where(eq(users.clerkUserId, userId))
    .orderBy(properties.name);
}

export type PropertyMember = {
  membershipId: string;
  role: Role;
  user: typeof users.$inferSelect;
};

/**
 * Members of a single property with their authoritative app roles (from our
 * DB, not Clerk). The caller must have already authorized access to
 * `propertyId` via `requireMembership`; this read is tenant-scoped by the id.
 */
export async function listPropertyMembers(
  propertyId: string,
): Promise<PropertyMember[]> {
  return db
    .select({
      membershipId: propertyMembers.id,
      role: propertyMembers.role,
      user: users,
    })
    .from(propertyMembers)
    .innerJoin(users, eq(users.id, propertyMembers.userId))
    .where(eq(propertyMembers.propertyId, propertyId))
    .orderBy(propertyMembers.createdAt);
}

/** Thrown by `requireMembership` when the caller lacks access. */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: number = 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Server guard for mutations/queries. Ensures the caller has an active
 * membership and, optionally, one of the allowed roles. Every route handler
 * and server action that touches property data should call this (spec §10).
 */
export async function requireMembership(
  allowed?: readonly Role[],
): Promise<Membership> {
  const membership = await getCurrentMembership();
  if (!membership) {
    throw new AuthorizationError("No active property membership", 401);
  }
  if (allowed && !allowed.includes(membership.role)) {
    throw new AuthorizationError("Insufficient role for this action", 403);
  }
  return membership;
}
