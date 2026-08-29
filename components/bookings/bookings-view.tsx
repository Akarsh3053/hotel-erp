"use client";

import { useMemo, useState } from "react";
import { Plus, Search, CalendarDays, UserCheck, CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookingCard } from "./booking-card";
import { ReservationFormDialog, type AvailableRoom } from "./reservation-form-dialog";
import {
  CheckInFormDialog,
  type ReservationToCheckIn,
} from "./check-in-form-dialog";
import {
  BookingDetailDialog,
  type BookingDetailData,
} from "./booking-detail-dialog";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "active" | "arriving" | "completed";

export function BookingsView({
  bookings,
  rooms,
  canManage,
}: {
  bookings: BookingDetailData[];
  rooms: AvailableRoom[];
  canManage: boolean;
}) {
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [activeReservationForCheckIn, setActiveReservationForCheckIn] =
    useState<ReservationToCheckIn | null>(null);

  const [detailBooking, setDetailBooking] = useState<BookingDetailData | null>(
    null,
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Tab counts
  const counts = useMemo(() => {
    let active = 0;
    let arriving = 0;
    let completed = 0;

    for (const b of bookings) {
      if (b.status === "checked_in") active++;
      else if (b.status === "reserved") arriving++;
      else if (b.status === "checked_out" || b.status === "cancelled") completed++;
    }

    return {
      all: bookings.length,
      active,
      arriving,
      completed,
    };
  }, [bookings]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Tab filter
      let matchesTab = true;
      if (filterTab === "active") matchesTab = b.status === "checked_in";
      else if (filterTab === "arriving") matchesTab = b.status === "reserved";
      else if (filterTab === "completed")
        matchesTab = b.status === "checked_out" || b.status === "cancelled";

      // Search filter
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesTab;

      const matchesRoom = b.roomNumber.toLowerCase().includes(query);
      const matchesType = b.roomTypeName.toLowerCase().includes(query);
      const matchesGuest = b.guests.some(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          (g.contact && g.contact.toLowerCase().includes(query)),
      );
      const matchesRef = b.id.toLowerCase().includes(query);

      return matchesTab && (matchesRoom || matchesType || matchesGuest || matchesRef);
    });
  }, [bookings, filterTab, searchQuery]);

  function handleOpenWalkIn() {
    setActiveReservationForCheckIn(null);
    setCheckInDialogOpen(true);
  }

  function handleCheckInFromReservation(res: ReservationToCheckIn) {
    setActiveReservationForCheckIn(res);
    setCheckInDialogOpen(true);
  }

  function handleViewDetails(b: BookingDetailData) {
    setDetailBooking(b);
    setDetailDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-muted-foreground">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"} total
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReservationDialogOpen(true)}
              disabled={rooms.length === 0}
            >
              <CalendarPlus data-icon="inline-start" />
              Reservation
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleOpenWalkIn}
              disabled={rooms.length === 0}
            >
              <UserCheck data-icon="inline-start" />
              Walk-in Check-In
            </Button>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search guest name, room, or phone number…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            filterTab === "all"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          All
          <span className="opacity-70">({counts.all})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("active")}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            filterTab === "active"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          Checked In
          <span className="opacity-70">({counts.active})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("arriving")}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            filterTab === "arriving"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          Reserved
          <span className="opacity-70">({counts.arriving})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("completed")}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            filterTab === "completed"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          History
          <span className="opacity-70">({counts.completed})</span>
        </button>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {bookings.length === 0 ? (
            <div className="space-y-2">
              <CalendarDays className="mx-auto size-8 text-muted-foreground" />
              <p className="font-semibold text-foreground">No bookings yet</p>
              <p className="text-xs text-muted-foreground">
                Create a reservation or check in walk-in guests to get started.
              </p>
              {canManage && rooms.length > 0 && (
                <div className="pt-2 flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReservationDialogOpen(true)}
                  >
                    <Plus data-icon="inline-start" />
                    New Reservation
                  </Button>
                </div>
              )}
            </div>
          ) : (
            "No bookings match the selected filter."
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              canManage={canManage}
              onViewDetails={handleViewDetails}
              onCheckIn={handleCheckInFromReservation}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ReservationFormDialog
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
        rooms={rooms}
      />

      <CheckInFormDialog
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        rooms={rooms}
        reservation={activeReservationForCheckIn}
      />

      <BookingDetailDialog
        booking={detailBooking}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        canManage={canManage}
        onCheckIn={handleCheckInFromReservation}
      />
    </div>
  );
}
