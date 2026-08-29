import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { rooms, roomTypes } from "@/lib/db/schema";
import { getCurrentMembership } from "@/lib/auth/rbac";
import { can } from "@/lib/auth/roles";
import { PageHeader } from "@/components/page-header";
import { RoomsView } from "@/components/rooms/rooms-view";

export const metadata = { title: "Rooms & Inventory" };

export default async function RoomsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/");

  const { role, property } = membership;

  // Cleaners only see their assigned tasks, not inventory setup (spec §3)
  if (!can(role, "inventory:view")) {
    redirect("/");
  }

  const canManage = can(role, "room:manage");
  const canManageStatus = can(role, "booking:manage") || canManage;

  const [propertyRoomTypes, propertyRooms] = await Promise.all([
    db
      .select({
        id: roomTypes.id,
        name: roomTypes.name,
        description: roomTypes.description,
        displayPrice: roomTypes.displayPrice,
        maxOccupancy: roomTypes.maxOccupancy,
      })
      .from(roomTypes)
      .where(eq(roomTypes.propertyId, property.id))
      .orderBy(roomTypes.name),
    db
      .select({
        id: rooms.id,
        roomNumber: rooms.roomNumber,
        floor: rooms.floor,
        roomTypeId: rooms.roomTypeId,
        status: rooms.status,
      })
      .from(rooms)
      .where(eq(rooms.propertyId, property.id))
      .orderBy(rooms.roomNumber),
  ]);

  return (
    <>
      <PageHeader
        title="Rooms & Inventory"
        description={`${property.name} · Room types, rates, and occupancy status.`}
      />
      <RoomsView
        rooms={propertyRooms}
        roomTypes={propertyRoomTypes}
        canManage={canManage}
        canManageStatus={canManageStatus}
      />
    </>
  );
}
