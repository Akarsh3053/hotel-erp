"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createReservationSchema,
} from "@/lib/validations/booking";
import { createReservation } from "@/app/(app)/bookings/actions";

import { Clock, Moon, Calendar, Loader2 } from "lucide-react";

export type AvailableRoom = {
  id: string;
  roomNumber: string;
  floor: string | null;
  status: string;
  roomTypeName: string;
  displayPrice: string | null;
  pricingType?: "fixed" | "flexi";
};

export function ReservationFormDialog({
  open,
  onOpenChange,
  rooms,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: AvailableRoom[];
}) {
  const router = useRouter();

  // Filter available rooms or allow all
  const availableRooms = rooms.filter((r) => r.status === "available");
  const displayRooms = availableRooms.length > 0 ? availableRooms : rooms;

  const todayStr = new Date().toISOString().split("T")[0]!;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      roomId: displayRooms[0]?.id ?? "",
      bookingType: "nightly" as "hourly" | "nightly" | "dates",
      scheduledCheckInAt: todayStr,
      durationNights: 1,
      totalPrice: "" as unknown as number,
      adultCount: 1,
      childCount: 0,
      primaryGuestName: "",
      primaryGuestContact: "",
    },
  });

  const selectedRoomId = watch("roomId");
  const selectedRoom = displayRooms.find(r => r.id === selectedRoomId);
  const bookingType = watch("bookingType");

  useEffect(() => {
    if (open) {
      let defaultRoomId = "";
      if (rooms && rooms.length > 0) {
        const available = rooms.filter((r) => r.status === "available");
        defaultRoomId = available.length > 0 ? available[0].id : rooms[0].id;
      }
      reset({
        roomId: defaultRoomId,
        bookingType: "nightly",
        scheduledCheckInAt: new Date().toISOString().split("T")[0]!,
        durationNights: 1,
        totalPrice: "" as unknown as number,
        adultCount: 1,
        childCount: 0,
        primaryGuestName: "",
        primaryGuestContact: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await createReservation(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Reservation created successfully");
    onOpenChange(false);
    reset();
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
            <DialogDescription>
              Book a room in advance for an upcoming guest stay.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            {/* Room selection & Booking Type */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="res-room">Select Room</Label>
                <Controller
                  name="roomId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="res-room" className="w-full">
                        <SelectValue placeholder="Choose a room" />
                      </SelectTrigger>
                      <SelectContent>
                        {displayRooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            Room {r.roomNumber} ({r.roomTypeName})
                            {r.status !== "available" ? ` · [${r.status}]` : ""}
                            {r.displayPrice ? ` - ₹${r.displayPrice}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.roomId ? (
                  <p className="text-sm text-destructive">
                    {errors.roomId.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="res-type">Booking Type</Label>
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent p-1">
                  <div className="flex w-full overflow-hidden rounded-sm">
                    <button
                      type="button"
                      onClick={() => setValue("bookingType", "hourly")}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-all ${
                        bookingType === "hourly"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Clock className="size-3.5" />
                      Hourly
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("bookingType", "nightly")}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-all ${
                        bookingType === "nightly"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Moon className="size-3.5" />
                      Nightly
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("bookingType", "dates")}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-all ${
                        bookingType === "dates"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Calendar className="size-3.5" />
                      Dates
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Check-in date & duration/check-out & tariff */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="res-date">Check-in Date</Label>
                <Input
                  id="res-date"
                  type="date"
                  min={todayStr}
                  aria-invalid={errors.scheduledCheckInAt ? true : undefined}
                  {...register("scheduledCheckInAt")}
                />
                {errors.scheduledCheckInAt ? (
                  <p className="text-sm text-destructive">
                    {errors.scheduledCheckInAt.message}
                  </p>
                ) : null}
              </div>

              {bookingType === "dates" ? (
                <div className="space-y-2">
                  <Label htmlFor="res-checkout">Check-out Date</Label>
                  <Input
                    id="res-checkout"
                    type="date"
                    min={todayStr}
                    aria-invalid={errors.scheduledCheckOutAt ? true : undefined}
                    {...register("scheduledCheckOutAt")}
                  />
                  {errors.scheduledCheckOutAt ? (
                    <p className="text-sm text-destructive">
                      {errors.scheduledCheckOutAt.message}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="res-nights">
                    {bookingType === "hourly" ? "Duration (Hours)" : "Duration (Nights)"}
                  </Label>
                  <Input
                    id="res-nights"
                    type="number"
                    min="1"
                    max="300"
                    aria-invalid={errors.durationNights ? true : undefined}
                    {...register("durationNights")}
                  />
                  {errors.durationNights ? (
                    <p className="text-sm text-destructive">
                      {errors.durationNights.message}
                    </p>
                  ) : null}
                </div>
              )}

              {selectedRoom?.pricingType === "flexi" && (
                <div className="space-y-2">
                  <Label htmlFor="res-tariff">Custom Tariff (₹)</Label>
                  <Input
                    id="res-tariff"
                    type="number"
                    min="0"
                    placeholder={selectedRoom.displayPrice ?? ""}
                    aria-invalid={errors.totalPrice ? true : undefined}
                    {...register("totalPrice")}
                  />
                  {errors.totalPrice ? (
                    <p className="text-sm text-destructive">
                      {errors.totalPrice.message}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Guest Counts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="res-adults">Adults (18+)</Label>
                <Input
                  id="res-adults"
                  type="number"
                  min="1"
                  max="10"
                  aria-invalid={errors.adultCount ? true : undefined}
                  {...register("adultCount")}
                />
                {errors.adultCount ? (
                  <p className="text-sm text-destructive">
                    {errors.adultCount.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="res-children">Children</Label>
                <Input
                  id="res-children"
                  type="number"
                  min="0"
                  max="10"
                  aria-invalid={errors.childCount ? true : undefined}
                  {...register("childCount")}
                />
                {errors.childCount ? (
                  <p className="text-sm text-destructive">
                    {errors.childCount.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Primary Guest Details */}
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Primary Contact
              </h4>
              <div className="space-y-2">
                <Label htmlFor="res-guest-name">Guest Full Name</Label>
                <Input
                  id="res-guest-name"
                  placeholder="e.g. Jane Doe"
                  autoComplete="off"
                  aria-invalid={errors.primaryGuestName ? true : undefined}
                  {...register("primaryGuestName")}
                />
                {errors.primaryGuestName ? (
                  <p className="text-sm text-destructive">
                    {errors.primaryGuestName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="res-guest-contact">Phone Number</Label>
                <Input
                  id="res-guest-contact"
                  type="tel"
                  placeholder="+1 555 019 2831"
                  autoComplete="off"
                  aria-invalid={errors.primaryGuestContact ? true : undefined}
                  {...register("primaryGuestContact")}
                />
                {errors.primaryGuestContact ? (
                  <p className="text-sm text-destructive">
                    {errors.primaryGuestContact.message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Creating…
                </>
              ) : (
                "Save Reservation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
