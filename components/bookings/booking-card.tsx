"use client";

import { Users, Calendar, ArrowRight, UserCheck, LogOut } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "./booking-status-badge";
import type { BookingDetailData } from "./booking-detail-dialog";
import type { ReservationToCheckIn } from "./check-in-form-dialog";

export function BookingCard({
  booking,
  canManage,
  onViewDetails,
  onCheckIn,
}: {
  booking: BookingDetailData;
  canManage: boolean;
  onViewDetails: (b: BookingDetailData) => void;
  onCheckIn: (res: ReservationToCheckIn) => void;
}) {
  const primaryGuest =
    booking.guests.find((g) => g.isPrimary) ?? booking.guests[0];

  const checkInDate = booking.actualCheckInAt
    ? new Date(booking.actualCheckInAt)
    : booking.scheduledCheckInAt
    ? new Date(booking.scheduledCheckInAt)
    : null;

  const checkOutDate = booking.actualCheckOutAt
    ? new Date(booking.actualCheckOutAt)
    : booking.scheduledCheckOutAt
    ? new Date(booking.scheduledCheckOutAt)
    : null;

  return (
    <Card className="p-4 transition-all hover:ring-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">
              Room {booking.roomNumber}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {booking.roomTypeName}
            </span>
          </div>

          <p className="mt-0.5 text-sm font-semibold text-foreground truncate">
            {primaryGuest?.name ?? "No guest name"}
          </p>
          {primaryGuest?.contact && (
            <p className="text-xs text-muted-foreground truncate">
              {primaryGuest.contact}
            </p>
          )}
        </div>

        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Stay timeline and guests */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-y-1 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 shrink-0" />
          <span>
            {checkInDate
              ? checkInDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
          <ArrowRight className="size-3 shrink-0" />
          <span>
            {checkOutDate
              ? checkOutDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Users className="size-3.5 shrink-0" />
          <span>
            {booking.adultCount} adult{booking.adultCount !== 1 ? "s" : ""}
            {booking.childCount > 0
              ? `, ${booking.childCount} child`
              : ""}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-border/40 pt-2.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(booking)}
          className="text-xs"
        >
          View Details
        </Button>

        {booking.status === "reserved" && canManage && (
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
            onClick={() =>
              onCheckIn({
                id: booking.id,
                roomId: booking.roomId,
                roomNumber: booking.roomNumber,
                primaryGuestName: primaryGuest?.name ?? "",
                primaryGuestContact: primaryGuest?.contact ?? "",
                adultCount: booking.adultCount,
                childCount: booking.childCount,
              })
            }
          >
            <UserCheck className="size-3.5" data-icon="inline-start" />
            Check In
          </Button>
        )}

        {booking.status === "checked_in" && canManage && (
          <Button
            size="sm"
            className="bg-amber-600 text-white hover:bg-amber-700 text-xs"
            onClick={() => onViewDetails(booking)}
          >
            <LogOut className="size-3.5" data-icon="inline-start" />
            Check Out
          </Button>
        )}
      </div>
    </Card>
  );
}
