import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { PropertyDetailsForm } from "@/components/property/property-details-form";
import {
  StaffManager,
  type PendingInvitation,
  type StaffMember,
} from "@/components/property/staff-manager";
import { DangerZone } from "@/components/property/danger-zone";
import { TemplateManager } from "@/components/housekeeping/template-manager";
import { getCurrentMembership, listPropertyMembers } from "@/lib/auth/rbac";
import { appRoleFromMetadata, listPendingInvitations } from "@/lib/auth/clerk-org";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  checklistTemplateItems,
  checklistTemplates,
  roomTypes,
} from "@/lib/db/schema";

export const metadata = { title: "Settings" };

function fullName(first: string | null, last: string | null): string | null {
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}

export default async function SettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/");

  const { role, property, user } = membership;
  const canManageStaff = can(role, "staff:manage");
  const canEditProperty = can(role, "property:update");
  const canDeleteProperty = can(role, "property:delete");
  const canManageChecklists = can(role, "checklist:manage");

  const rawMembers = await listPropertyMembers(property.id);
  const members: StaffMember[] = rawMembers.map((m) => ({
    membershipId: m.membershipId,
    role: m.role,
    name: fullName(m.user.firstName, m.user.lastName),
    email: m.user.email,
    isSelf: m.user.id === user.id,
    isOwner: m.role === "owner",
  }));

  let invitations: PendingInvitation[] = [];
  if (canManageStaff && property.clerkOrgId) {
    try {
      const pending = await listPendingInvitations(property.clerkOrgId);
      invitations = pending.map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        role: appRoleFromMetadata(inv.publicMetadata) ?? "member",
      }));
    } catch (err) {
      console.error("[settings] failed to list pending invitations", err);
    }
  }

  // Fetch checklist templates and room types if allowed to manage checklists
  const [templates, propertyRoomTypes] = canManageChecklists
    ? await Promise.all([
        db
          .select({
            id: checklistTemplates.id,
            name: checklistTemplates.name,
            defaultForRoomTypeId: checklistTemplates.defaultForRoomTypeId,
            defaultForRoomTypeName: roomTypes.name,
            itemCount: sql<number>`coalesce(count(distinct ${checklistTemplateItems.id}), 0)`,
          })
          .from(checklistTemplates)
          .leftJoin(roomTypes, eq(checklistTemplates.defaultForRoomTypeId, roomTypes.id))
          .leftJoin(
            checklistTemplateItems,
            eq(checklistTemplateItems.templateId, checklistTemplates.id)
          )
          .where(eq(checklistTemplates.propertyId, property.id))
          .groupBy(checklistTemplates.id, roomTypes.name),
        db
          .select({ id: roomTypes.id, name: roomTypes.name })
          .from(roomTypes)
          .where(eq(roomTypes.propertyId, property.id)),
      ])
    : [[], []];

  return (
    <>
      <PageHeader title="Settings" description={property.name} />
      <div className="space-y-10">
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Property</h2>
          <PropertyDetailsForm
            canEdit={canEditProperty}
            property={{
              name: property.name,
              address: property.address,
              totalRooms: property.totalRooms,
            }}
          />
        </section>

        {canManageChecklists ? (
          <section>
            <TemplateManager
              canManage={canManageChecklists}
              templates={templates}
              roomTypes={propertyRoomTypes}
            />
          </section>
        ) : null}

        {canManageStaff ? (
          <section>
            <StaffManager
              canManage={canManageStaff}
              members={members}
              invitations={invitations}
            />
          </section>
        ) : null}

        {canDeleteProperty ? (
          <section>
            <DangerZone propertyName={property.name} />
          </section>
        ) : null}
      </div>
    </>
  );
}
