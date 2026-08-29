import { redirect } from "next/navigation";
import { eq, inArray, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { bookings, guests, rooms, roomTypes } from "@/lib/db/schema";
import { getCurrentMembership } from "@/lib/auth/rbac";
import { can } from "@/lib/auth/roles";
import { PageHeader } from "@/components/page-header";
import { BookingsView } from "@/components/bookings/bookings-view";
import type { BookingDetailData, GuestDetail } from "@/components/bookings/booking-detail-dialog";
import type { AvailableRoom } from "@/components/bookings/reservation-form-dialog";

export const metadata = { title: "Bookings & Stays" };

export default async function BookingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/");

  const { role, property } = membership;

  // Cleaners only see their own assigned housekeeping tasks (spec §3)
  if (!can(role, "booking:manage")) {
    redirect("/");
  }

  const canManage = can(role, "booking:manage");

  // 1. Fetch all bookings for this property with room & roomType info
  const propertyBookings = await db
    .select({
      id: bookings.id,
      roomId: bookings.roomId,
      roomNumber: rooms.roomNumber,
      roomTypeName: roomTypes.name,
      status: bookings.status,
      scheduledCheckInAt: bookings.scheduledCheckInAt,
      scheduledCheckOutAt: bookings.scheduledCheckOutAt,
      actualCheckInAt: bookings.actualCheckInAt,
      actualCheckOutAt: bookings.actualCheckOutAt,
      adultCount: bookings.adultCount,
      childCount: bookings.childCount,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(rooms, eq(bookings.roomId, rooms.id))
    .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
    .where(eq(bookings.propertyId, property.id))
    .orderBy(desc(bookings.createdAt));

  // 2. Fetch guests for all fetched bookings
  const bookingIds = propertyBookings.map((b) => b.id);
  let allGuests: Array<{
    id: string;
    bookingId: string;
    guestType: "adult" | "child";
    name: string;
    address: string | null;
    gender: string | null;
    age: number | null;
    contact: string | null;
    idPhotoFrontUrl: string | null;
    idPhotoBackUrl: string | null;
    isPrimary: boolean;
  }> = [];

  if (bookingIds.length > 0) {
    allGuests = await db
      .select({
        id: guests.id,
        bookingId: guests.bookingId,
        guestType: guests.guestType,
        name: guests.name,
        address: guests.address,
        gender: guests.gender,
        age: guests.age,
        contact: guests.contact,
        idPhotoFrontUrl: guests.idPhotoFrontUrl,
        idPhotoBackUrl: guests.idPhotoBackUrl,
        isPrimary: guests.isPrimary,
      })
      .from(guests)
      .where(inArray(guests.bookingId, bookingIds));
  }

  // Group guests by booking ID
  const guestsByBooking = new Map<string, GuestDetail[]>();
  for (const g of allGuests) {
    const list = guestsByBooking.get(g.bookingId) ?? [];
    list.push(g);
    guestsByBooking.set(g.bookingId, list);
  }

  const structuredBookings: BookingDetailData[] = propertyBookings.map((b) => ({
    ...b,
    guests: guestsByBooking.get(b.id) ?? [],
  }));

  // 3. Fetch all property rooms for the room selection dropdowns
  const propertyRooms = await db
    .select({
      id: rooms.id,
      roomNumber: rooms.roomNumber,
      floor: rooms.floor,
      status: rooms.status,
      roomTypeName: roomTypes.name,
      displayPrice: roomTypes.displayPrice,
      pricingType: roomTypes.pricingType,
    })
    .from(rooms)
    .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
    .where(eq(rooms.propertyId, property.id))
    .orderBy(rooms.roomNumber);

  const availableRooms: AvailableRoom[] = propertyRooms.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    floor: r.floor,
    status: r.status,
    roomTypeName: r.roomTypeName,
    displayPrice: r.displayPrice,
    pricingType: r.pricingType as "fixed" | "flexi",
  }));

  return (
    <>
      <PageHeader
        title="Bookings & Stays"
        description={`${property.name} · Reservations, check-in, and guest management.`}
      />
      <BookingsView
        bookings={structuredBookings}
        rooms={availableRooms}
        canManage={canManage}
      />
    </>
  );
}
