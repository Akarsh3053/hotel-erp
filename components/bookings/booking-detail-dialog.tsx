"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  LogOut,
  XCircle,
  Loader2,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookingStatusBadge } from "./booking-status-badge";
import { cancelBooking, checkOutBooking } from "@/app/(app)/bookings/actions";
import type { BookingStatus } from "@/lib/validations/booking";
import type { ReservationToCheckIn } from "./check-in-form-dialog";

export type GuestDetail = {
  id: string;
  guestType: "adult" | "child";
  name: string;
  address: string | null;
  gender: string | null;
  age: number | null;
  contact: string | null;
  idPhotoFrontUrl: string | null;
  idPhotoBackUrl: string | null;
  isPrimary: boolean;
};

export type BookingDetailData = {
  id: string;
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  status: BookingStatus;
  scheduledCheckInAt: Date | string | null;
  scheduledCheckOutAt: Date | string | null;
  actualCheckInAt: Date | string | null;
  actualCheckOutAt: Date | string | null;
  adultCount: number;
  childCount: number;
  createdAt: Date | string;
  guests: GuestDetail[];
};

export function BookingDetailDialog({
  booking,
  open,
  onOpenChange,
  canManage,
  onCheckIn,
}: {
  booking: BookingDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onCheckIn?: (res: ReservationToCheckIn) => void;
}) {
  const router = useRouter();

  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Secure ID photo preview state
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [viewingPhotoTitle, setViewingPhotoTitle] = useState("");
  const [fetchingPhoto, setFetchingPhoto] = useState(false);

  if (!booking) return null;

  async function handleCheckout() {
    if (!booking) return;
    setIsProcessing(true);
    const result = await checkOutBooking(booking.id);
    setIsProcessing(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Room ${booking.roomNumber} checked out. Housekeeping task dispatched.`);
    setCheckoutConfirmOpen(false);
    onOpenChange(false);
    router.refresh();
  }

  async function handleCancel() {
    if (!booking) return;
    setIsProcessing(true);
    const result = await cancelBooking(booking.id);
    setIsProcessing(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Reservation for Room ${booking.roomNumber} cancelled.`);
    setCancelConfirmOpen(false);
    onOpenChange(false);
    router.refresh();
  }

  async function handleViewIdPhoto(
    guestId: string,
    guestName: string,
    side: "front" | "back",
  ) {
    setFetchingPhoto(true);
    setViewingPhotoTitle(`${guestName} — ID (${side})`);
    setPhotoViewerOpen(true);
    setViewingPhotoUrl(null);

    try {
      const res = await fetch(`/api/guests/${guestId}/id-photo?side=${side}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not load photo");
      }
      setViewingPhotoUrl(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load ID photo");
      setPhotoViewerOpen(false);
    } finally {
      setFetchingPhoto(false);
    }
  }

  const primaryGuest = booking.guests.find((g) => g.isPrimary) ?? booking.guests[0];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-4">
              <DialogTitle className="text-lg">
                Room {booking.roomNumber} · {booking.roomTypeName}
              </DialogTitle>
              <BookingStatusBadge status={booking.status} />
            </div>
            <DialogDescription>
              Booking Reference: #{booking.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-5 text-sm">
            {/* Stay Timeline Details */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Stay Dates & Times
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" /> {booking.adultCount} adult(s)
                  {booking.childCount > 0 ? `, ${booking.childCount} child(ren)` : ""}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Check-in:</span>
                  <p className="font-semibold text-foreground">
                    {booking.actualCheckInAt
                      ? new Date(booking.actualCheckInAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : booking.scheduledCheckInAt
                      ? `${new Date(booking.scheduledCheckInAt).toLocaleDateString()} (Sched)`
                      : "—"}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground">Check-out:</span>
                  <p className="font-semibold text-foreground">
                    {booking.actualCheckOutAt
                      ? new Date(booking.actualCheckOutAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : booking.scheduledCheckOutAt
                      ? `${new Date(booking.scheduledCheckOutAt).toLocaleDateString()} (Sched)`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Guest Roster */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registered Guests ({booking.guests.length})
              </h4>

              {booking.guests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No guest details registered yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {booking.guests.map((g) => (
                    <div
                      key={g.id}
                      className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {g.name}
                          </span>
                          {g.isPrimary && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              Primary
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">
                            ({g.guestType})
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {g.gender ? `${g.gender}, ` : ""}
                          {g.age ? `${g.age} yrs` : ""}
                        </span>
                      </div>

                      {g.contact && (
                        <p className="text-xs text-muted-foreground">
                          📞 {g.contact}
                        </p>
                      )}

                      {g.address && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          📍 {g.address}
                        </p>
                      )}

                      {/* ID Photos view buttons for authorized staff */}
                      {(g.idPhotoFrontUrl || g.idPhotoBackUrl) && canManage && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                          <ShieldCheck className="size-3.5 text-emerald-600" />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Verified ID:
                          </span>
                          {g.idPhotoFrontUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[11px]"
                              onClick={() =>
                                handleViewIdPhoto(g.id, g.name, "front")
                              }
                            >
                              <Eye className="size-3" data-icon="inline-start" />
                              Front
                            </Button>
                          )}
                          {g.idPhotoBackUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[11px]"
                              onClick={() =>
                                handleViewIdPhoto(g.id, g.name, "back")
                              }
                            >
                              <Eye className="size-3" data-icon="inline-start" />
                              Back
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {booking.status === "reserved" && canManage && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setCancelConfirmOpen(true)}
                >
                  <XCircle className="size-4" data-icon="inline-start" />
                  Cancel Reservation
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    onOpenChange(false);
                    onCheckIn?.({
                      id: booking.id,
                      roomId: booking.roomId,
                      roomNumber: booking.roomNumber,
                      primaryGuestName: primaryGuest?.name ?? "",
                      primaryGuestContact: primaryGuest?.contact ?? "",
                      adultCount: booking.adultCount,
                      childCount: booking.childCount,
                    });
                  }}
                >
                  Check In
                </Button>
              </>
            )}

            {booking.status === "checked_in" && canManage && (
              <Button
                type="button"
                className="w-full bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => setCheckoutConfirmOpen(true)}
              >
                <LogOut className="size-4" data-icon="inline-start" />
                Check Out Guest
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Confirmation Dialog */}
      <Dialog open={checkoutConfirmOpen} onOpenChange={setCheckoutConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Check out Room {booking.roomNumber}?</DialogTitle>
            <DialogDescription>
              This will complete the guest stay, change the room status to{" "}
              <strong>Housekeeping</strong>, and automatically generate a cleaning
              task for the housekeeping team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isProcessing}
              onClick={() => setCheckoutConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isProcessing}
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={handleCheckout}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Checking out…
                </>
              ) : (
                "Confirm Check Out"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cancel Reservation for Room {booking.roomNumber}?</DialogTitle>
            <DialogDescription>
              This will release Room {booking.roomNumber} back to available inventory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isProcessing}
              onClick={() => setCancelConfirmOpen(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isProcessing}
              onClick={handleCancel}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Cancelling…
                </>
              ) : (
                "Cancel Reservation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ID Photo Viewer Modal */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {viewingPhotoTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="my-2 flex min-h-48 items-center justify-center rounded-xl bg-black/5 p-2">
            {fetchingPhoto ? (
              <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span>Decrypting & loading private ID document…</span>
              </div>
            ) : viewingPhotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={viewingPhotoUrl}
                alt={viewingPhotoTitle}
                className="max-h-[65vh] w-full rounded-lg object-contain shadow-md"
              />
            ) : (
              <p className="text-xs text-destructive">Could not load image.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
