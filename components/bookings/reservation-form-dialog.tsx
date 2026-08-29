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

export type AvailableRoom = {
  id: string;
  roomNumber: string;
  floor: string | null;
  status: string;
  roomTypeName: string;
  displayPrice: string | null;
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
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      roomId: displayRooms[0]?.id ?? "",
      scheduledCheckInAt: todayStr,
      durationNights: 1,
      adultCount: 1,
      childCount: 0,
      primaryGuestName: "",
      primaryGuestContact: "",
    },
  });

  useEffect(() => {
    if (open) {
      let defaultRoomId = "";
      if (rooms && rooms.length > 0) {
        const available = rooms.filter((r) => r.status === "available");
        defaultRoomId = available.length > 0 ? available[0].id : rooms[0].id;
      }
      reset({
        roomId: defaultRoomId,
        scheduledCheckInAt: new Date().toISOString().split("T")[0]!,
        durationNights: 1,
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
            {/* Room selection */}
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
                          {r.displayPrice ? ` - $${r.displayPrice}/night` : ""}
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

            {/* Check-in date & duration */}
            <div className="grid grid-cols-2 gap-3">
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

              <div className="space-y-2">
                <Label htmlFor="res-nights">Nights</Label>
                <Input
                  id="res-nights"
                  type="number"
                  min="1"
                  max="60"
                  aria-invalid={errors.durationNights ? true : undefined}
                  {...register("durationNights")}
                />
                {errors.durationNights ? (
                  <p className="text-sm text-destructive">
                    {errors.durationNights.message}
                  </p>
                ) : null}
              </div>
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
              {isSubmitting ? "Creating…" : "Save Reservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
