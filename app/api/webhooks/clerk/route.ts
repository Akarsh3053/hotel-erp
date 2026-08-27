import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { properties, propertyMembers, users } from "@/lib/db/schema";
import { appRoleFromMetadata } from "@/lib/auth/clerk-org";
import { INVITABLE_ROLES, type InvitableRole } from "@/lib/validations/property";

export const dynamic = "force-dynamic";

type ClerkEmail = { id: string; email_address: string };

type ClerkUserData = {
  id: string;
  email_addresses?: ClerkEmail[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

type ClerkPublicUserData = {
  user_id?: string;
  identifier?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

type ClerkMembershipData = {
  organization?: { id?: string };
  public_user_data?: ClerkPublicUserData;
  public_metadata?: Record<string, unknown> | null;
  role?: string;
};

type ClerkEvent =
  | { type: "user.created" | "user.updated"; data: ClerkUserData }
  | { type: "user.deleted"; data: { id?: string; deleted?: boolean } }
  | {
      type: "organizationMembership.created" | "organizationMembership.deleted";
      data: ClerkMembershipData;
    }
  | { type: "organization.deleted"; data: { id?: string } }
  | { type: string; data: Record<string, unknown> };

function primaryEmailOf(data: ClerkUserData): string | null {
  const emails = data.email_addresses ?? [];
  const primary = emails.find((e) => e.id === data.primary_email_address_id);
  return primary?.email_address ?? emails[0]?.email_address ?? null;
}

/** Upsert the local `users` row from a membership payload; returns its id. */
async function upsertUserFromPublicData(
  pud: ClerkPublicUserData,
): Promise<string | null> {
  const clerkUserId = pud.user_id;
  if (!clerkUserId) return null;
  const values = {
    clerkUserId,
    email: pud.identifier ?? null,
    firstName: pud.first_name ?? null,
    lastName: pud.last_name ?? null,
    imageUrl: pud.image_url ?? null,
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
    .returning({ id: users.id });
  return row?.id ?? null;
}

function isInvitableRole(role: string | null): role is InvitableRole {
  return role !== null && (INVITABLE_ROLES as readonly string[]).includes(role);
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const payload = await req.text();
  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  let event: ClerkEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const data = event.data as ClerkUserData;
      const values = {
        clerkUserId: data.id,
        email: primaryEmailOf(data),
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
        imageUrl: data.image_url ?? null,
      };
      await db
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
        });
      break;
    }
    case "user.deleted": {
      const id = (event.data as { id?: string }).id;
      if (id) {
        await db.delete(users).where(eq(users.clerkUserId, id));
      }
      break;
    }
    case "organizationMembership.created": {
      // A user accepted an invitation (or otherwise joined an org). Mirror it
      // into the authoritative `property_members` table with the app role that
      // travelled via the invitation's publicMetadata.
      const data = event.data as ClerkMembershipData;
      const orgId = data.organization?.id;
      const pud = data.public_user_data;
      if (!orgId || !pud?.user_id) break;

      const [property] = await db
        .select({ id: properties.id, ownerUserId: properties.ownerUserId })
        .from(properties)
        .where(eq(properties.clerkOrgId, orgId))
        .limit(1);
      if (!property) break;

      const localUserId = await upsertUserFromPublicData(pud);
      if (!localUserId) break;

      // The owner's role is fixed when the property is created — never let a
      // membership event (which also fires for the creator, possibly carrying
      // a stale appRole from another org) alter it.
      if (localUserId === property.ownerUserId) break;

      let appRole = appRoleFromMetadata(data.public_metadata ?? undefined);
      if (!appRole) {
        try {
          const client = await clerkClient();
          const cu = await client.users.getUser(pud.user_id);
          appRole = appRoleFromMetadata(
            cu.publicMetadata as Record<string, unknown>,
          );
        } catch (err) {
          console.error("[webhook] getUser for appRole failed", err);
        }
      }
      if (!isInvitableRole(appRole)) break;

      await db
        .insert(propertyMembers)
        .values({ propertyId: property.id, userId: localUserId, role: appRole })
        .onConflictDoNothing();
      break;
    }
    case "organizationMembership.deleted": {
      const data = event.data as ClerkMembershipData;
      const orgId = data.organization?.id;
      const clerkUserId = data.public_user_data?.user_id;
      if (!orgId || !clerkUserId) break;

      const [property] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.clerkOrgId, orgId))
        .limit(1);
      if (!property) break;

      const [u] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1);
      if (!u) break;

      await db
        .delete(propertyMembers)
        .where(
          and(
            eq(propertyMembers.propertyId, property.id),
            eq(propertyMembers.userId, u.id),
          ),
        );
      break;
    }
    case "organization.deleted": {
      const id = (event.data as { id?: string }).id;
      if (id) {
        // FK cascade removes members, rooms, bookings, etc.
        await db.delete(properties).where(eq(properties.clerkOrgId, id));
      }
      break;
    }
    default:
      // Other event types are ignored for now.
      break;
  }

  return NextResponse.json({ received: true });
}
