"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  Building2,
  Sparkles,
  Loader2,
  Clock,
  Moon,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhotoInput } from "@/components/media/photo-input";
import {
  GENDERS,
  GENDER_LABELS,
  type Gender,
} from "@/lib/validations/booking";
import {
  checkInReservation,
  checkInWalkIn,
} from "@/app/(app)/bookings/actions";
import type { AvailableRoom } from "./reservation-form-dialog";

type AdultFormState = {
  name: string;
  address: string;
  gender: Gender;
  age: string;
  contact: string;
  idPhotoFrontFile: File | null;
  idPhotoBackFile: File | null;
  idPhotoFrontPublicId?: string | null;
  idPhotoBackPublicId?: string | null;
  isPrimary: boolean;
};

type ChildFormState = {
  name: string;
  gender: Gender;
  age: string;
};

export type ReservationToCheckIn = {
  id: string;
  roomId: string;
  roomNumber: string;
  primaryGuestName: string;
  primaryGuestContact: string;
  adultCount: number;
  childCount: number;
  scheduledCheckOutAt?: Date | string | null;
};

export function CheckInFormDialog({
  open,
  onOpenChange,
  rooms,
  reservation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: AvailableRoom[];
  reservation?: ReservationToCheckIn | null;
}) {
  const router = useRouter();
  const isReservationCheckIn = Boolean(reservation);

  const availableRooms = rooms.filter((r) => r.status === "available");
  const displayRooms = availableRooms.length > 0 ? availableRooms : rooms;

  // Stay state
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [bookingType, setBookingType] = useState<"hourly" | "nightly" | "dates">("nightly");
  const [durationNights, setDurationNights] = useState<number>(1);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [adultCount, setAdultCount] = useState<number>(1);
  const [childCount, setChildCount] = useState<number>(0);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
  const [totalPrice, setTotalPrice] = useState<string>("");

  // Dynamic guest forms state
  const [adults, setAdults] = useState<AdultFormState[]>([]);
  const [children, setChildren] = useState<ChildFormState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(
    null,
  );

  // Initialize or reset form state when dialog opens
  useEffect(() => {
    if (!open) return;

    if (reservation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedRoomId(reservation.roomId);
      setBookingType("nightly");
      setDurationNights(1);
      const resAdults = Math.max(1, reservation.adultCount ?? 1);
      const resChildren = reservation.childCount ?? 0;
      setAdultCount(resAdults);
      setChildCount(resChildren);
      setTotalPrice("");

      const initialAdults: AdultFormState[] = Array.from(
        { length: resAdults },
        (_, i) => ({
          name: i === 0 ? reservation.primaryGuestName ?? "" : "",
          address: "",
          gender: "male" as Gender,
          age: "30",
          contact: i === 0 ? reservation.primaryGuestContact ?? "" : "",
          idPhotoFrontFile: null,
          idPhotoBackFile: null,
          isPrimary: i === 0,
        }),
      );

      const initialChildren: ChildFormState[] = Array.from(
        { length: resChildren },
        () => ({
          name: "",
          gender: "male" as Gender,
          age: "8",
        }),
      );

      setAdults(initialAdults);
      setChildren(initialChildren);
    } else {
      let defaultRoomId = "";
      let defaultRoom: AvailableRoom | null = null;
      // Avoid runtime crash if displayRooms isn't strictly defined yet
      if (rooms && rooms.length > 0) {
        const availableRooms = rooms.filter((r) => r.status === "available");
        if (availableRooms.length > 0) {
          defaultRoomId = availableRooms[0].id;
          defaultRoom = availableRooms[0];
        } else {
          defaultRoomId = rooms[0].id;
          defaultRoom = rooms[0];
        }
      }

      setSelectedRoomId(defaultRoomId);
      setSelectedRoom(defaultRoom);
      setBookingType("nightly");
      setDurationNights(1);
      setDurationHours(2);
      setAdultCount(1);
      setChildCount(0);
      setTotalPrice("");
      setAdults([
        {
          name: "",
          address: "",
          gender: "male" as Gender,
          age: "30",
          contact: "",
          idPhotoFrontFile: null,
          idPhotoBackFile: null,
          isPrimary: true,
        },
      ]);
      setChildren([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservation?.id]);

  // Update selected room when room selection changes
  useEffect(() => {
    if (selectedRoomId) {
      const room = displayRooms.find((r) => r.id === selectedRoomId);
      setSelectedRoom(room ?? null);
    }
  }, [selectedRoomId, displayRooms]);

  // Adjust adult forms when adult count changes
  function handleAdultCountChange(newCount: number | "") {
    if (newCount === "") {
      setAdultCount("" as unknown as number);
      return;
    }
    const clamped = Math.max(1, Math.min(10, newCount));
    setAdultCount(clamped);

    setAdults((prev) => {
      if (prev.length === clamped) return prev;
      if (prev.length < clamped) {
        const added: AdultFormState[] = Array.from(
          { length: clamped - prev.length },
          () => ({
            name: "",
            address: "",
            gender: "male" as Gender,
            age: "30",
            contact: "",
            idPhotoFrontFile: null,
            idPhotoBackFile: null,
            isPrimary: false,
          }),
        );
        return [...prev, ...added];
      }
      const sliced = prev.slice(0, clamped);
      // Ensure at least one is primary
      if (!sliced.some((a) => a.isPrimary)) {
        if (sliced[0]) sliced[0].isPrimary = true;
      }
      return sliced;
    });
  }

  // Adjust child forms when child count changes
  function handleChildCountChange(newCount: number | "") {
    if (newCount === "") {
      setChildCount("" as unknown as number);
      return;
    }
    const clamped = Math.max(0, Math.min(10, newCount));
    setChildCount(clamped);

    setChildren((prev) => {
      if (prev.length === clamped) return prev;
      if (prev.length < clamped) {
        const added: ChildFormState[] = Array.from(
          { length: clamped - prev.length },
          () => ({
            name: "",
            gender: "male" as Gender,
            age: "8",
          }),
        );
        return [...prev, ...added];
      }
      return prev.slice(0, clamped);
    });
  }

  function updateAdult(index: number, patch: Partial<AdultFormState>) {
    setAdults((prev) =>
      prev.map((a, i) => {
        if (i !== index) {
          // If setting primary on this adult, unmark others
          if (patch.isPrimary) return { ...a, isPrimary: false };
          return a;
        }
        return { ...a, ...patch };
      }),
    );
  }

  function updateChild(index: number, patch: Partial<ChildFormState>) {
    setChildren((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  }

  // Helper to upload an ID photo to Cloudinary authenticated storage
  async function uploadIdPhoto(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads/id-photo", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to upload ID photo");
    }

    const data = await response.json();
    return data.publicId ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedRoomId) {
      toast.error("Please select a room");
      return;
    }

    // Client-side validations
    for (let i = 0; i < adults.length; i++) {
      const a = adults[i]!;
      if (!a.name.trim() || a.name.trim().length < 2) {
        toast.error(`Adult Guest #${i + 1}: Name must be at least 2 characters`);
        return;
      }
      if (!a.address.trim() || a.address.trim().length < 5) {
        toast.error(
          `Adult Guest #${i + 1}: Address must be at least 5 characters`,
        );
        return;
      }
      if (!a.contact.trim()) {
        toast.error(`Adult Guest #${i + 1}: Phone number is required`);
        return;
      }
      const ageNum = parseInt(a.age, 10);
      if (isNaN(ageNum) || ageNum < 18) {
        toast.error(`Adult Guest #${i + 1}: Must be 18 or older`);
        return;
      }
    }

    for (let i = 0; i < children.length; i++) {
      const c = children[i]!;
      if (!c.name.trim() || c.name.trim().length < 2) {
        toast.error(`Child Guest #${i + 1}: Name must be at least 2 characters`);
        return;
      }
    }

    const primaryIndex = adults.findIndex((a) => a.isPrimary);
    if (primaryIndex === -1) {
      toast.error("Please select one adult as the primary guest");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload captured ID photos to Cloudinary
      const uploadedAdults = [];

      for (let i = 0; i < adults.length; i++) {
        const adult = adults[i]!;
        let frontPublicId = adult.idPhotoFrontPublicId ?? null;
        let backPublicId = adult.idPhotoBackPublicId ?? null;

        if (adult.idPhotoFrontFile) {
          setUploadProgressText(
            `Uploading ID photo (front) for ${adult.name || `Guest #${i + 1}`}…`,
          );
          frontPublicId = await uploadIdPhoto(adult.idPhotoFrontFile);
        }

        if (adult.idPhotoBackFile) {
          setUploadProgressText(
            `Uploading ID photo (back) for ${adult.name || `Guest #${i + 1}`}…`,
          );
          backPublicId = await uploadIdPhoto(adult.idPhotoBackFile);
        }

        uploadedAdults.push({
          name: adult.name.trim(),
          address: adult.address.trim(),
          gender: adult.gender,
          age: parseInt(adult.age, 10),
          contact: adult.contact.trim(),
          idPhotoFront: frontPublicId,
          idPhotoBack: backPublicId,
          isPrimary: adult.isPrimary,
        });
      }

      setUploadProgressText("Saving check-in records…");

      const formattedChildren = children.map((c) => ({
        name: c.name.trim(),
        gender: c.gender,
        age: parseInt(c.age, 10) || 0,
      }));

      let result;

      if (isReservationCheckIn && reservation) {
        result = await checkInReservation({
          bookingId: reservation.id,
          adultCount,
          childCount,
          adults: uploadedAdults,
          children: formattedChildren,
        });
      } else {
        result = await checkInWalkIn({
          roomId: selectedRoomId,
          bookingType,
          durationNights: bookingType === "hourly" ? durationHours : durationNights,
          totalPrice: totalPrice ? Number(totalPrice) : undefined,
          adultCount,
          childCount,
          adults: uploadedAdults,
          children: formattedChildren,
        });
      }

      if (!result.ok) {
        toast.error(result.error);
        setIsSubmitting(false);
        setUploadProgressText(null);
        return;
      }

      toast.success(
        isReservationCheckIn
          ? "Reservation checked in successfully"
          : "Walk-in guest checked in successfully",
      );
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setUploadProgressText(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] max-w-xl overflow-y-auto p-4 sm:p-6 lg:max-w-4xl"
        onInteractOutside={(e) => {
          // Allow closing when clicking the overlay, but prevent closing when
          // clicking Select dropdowns or other portaled UI elements
          const target = e.target as HTMLElement;
          if (target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="size-5 text-emerald-600" />
              {isReservationCheckIn
                ? `Check In Reservation — Room ${reservation?.roomNumber}`
                : "Walk-in Guest Check In"}
            </DialogTitle>
            <DialogDescription>
              {isReservationCheckIn
                ? "Verify guest details and capture mandatory ID photos before handing over the room key."
                : "Register arriving walk-in guests with ID photo capture and room assignment."}
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 space-y-6">
            {/* SECTION 1: STAY DETAILS */}
            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Building2 className="size-3.5" />
                  1. Stay Details
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="checkin-room">Room</Label>
                  <Select
                    value={selectedRoomId}
                    onValueChange={setSelectedRoomId}
                    disabled={isReservationCheckIn}
                  >
                    <SelectTrigger id="checkin-room" className="w-full">
                      <SelectValue placeholder="Choose a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayRooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          Room {r.roomNumber} ({r.roomTypeName})
                          {r.status !== "available" ? ` [${r.status}]` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!isReservationCheckIn && (
                  <div className="space-y-1.5">
                    <Label htmlFor="checkin-type">Booking Type</Label>
                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent p-1">
                      <div className="flex w-full overflow-hidden rounded-sm">
                        <button
                          type="button"
                          onClick={() => setBookingType("hourly")}
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
                          onClick={() => setBookingType("nightly")}
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
                          onClick={() => setBookingType("dates")}
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
                )}
              </div>

              {!isReservationCheckIn && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="checkin-duration">
                      {bookingType === "hourly" ? "Duration (Hours)" : "Duration (Nights)"}
                    </Label>
                    <Input
                      id="checkin-duration"
                      type="number"
                      min={1}
                      max={60}
                      value={bookingType === "hourly" ? durationHours || "" : durationNights || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const cleanVal = isNaN(val) ? ("" as unknown as number) : val;
                        if (bookingType === "hourly") {
                          setDurationHours(cleanVal);
                        } else {
                          setDurationNights(cleanVal);
                        }
                      }}
                      disabled={bookingType === "dates"}
                    />
                  </div>

                  {selectedRoom?.pricingType === "flexi" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="checkin-tariff">Custom Tariff (₹)</Label>
                      <Input
                        id="checkin-tariff"
                        type="number"
                        min={0}
                        placeholder={selectedRoom.displayPrice ?? ""}
                        value={totalPrice}
                        onChange={(e) => setTotalPrice(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Guest Counts Switcher */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="checkin-adult-count">Adults (18+)</Label>
                  <Input
                    id="checkin-adult-count"
                    type="number"
                    min={1}
                    max={10}
                    value={adultCount || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleAdultCountChange(isNaN(val) ? ("" as unknown as number) : val);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="checkin-child-count">Children (&lt;18)</Label>
                  <Input
                    id="checkin-child-count"
                    type="number"
                    min={0}
                    max={10}
                    value={childCount !== undefined && childCount !== null ? childCount : ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleChildCountChange(isNaN(val) ? ("" as unknown as number) : val);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: ADULT GUESTS (DYNAMIC CARDS) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users className="size-3.5" />
                  2. Adult Guests ({adults.length})
                </h3>
                <span className="text-xs text-muted-foreground">
                  ID photo required per adult
                </span>
              </div>

              {adults.map((adult, idx) => (
                <div
                  key={idx}
                  className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-sm font-bold">
                      Adult Guest #{idx + 1}
                    </span>

                    {/* Primary Guest Radio Selection */}
                    <button
                      type="button"
                      onClick={() => updateAdult(idx, { isPrimary: true })}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        adult.isPrimary
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <Sparkles className="size-3" />
                      {adult.isPrimary ? "Primary Guest" : "Set as Primary"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`adult-${idx}-name`}>Full Name *</Label>
                      <Input
                        id={`adult-${idx}-name`}
                        placeholder="Full Legal Name"
                        value={adult.name}
                        onChange={(e) =>
                          updateAdult(idx, { name: e.target.value })
                        }
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`adult-${idx}-contact`}>Phone Contact *</Label>
                      <Input
                        id={`adult-${idx}-contact`}
                        type="tel"
                        placeholder="+1 555 123 4567"
                        value={adult.contact}
                        onChange={(e) =>
                          updateAdult(idx, { contact: e.target.value })
                        }
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`adult-${idx}-gender`}>Gender</Label>
                      <Select
                        value={adult.gender}
                        onValueChange={(val) =>
                          updateAdult(idx, { gender: val as Gender })
                        }
                      >
                        <SelectTrigger id={`adult-${idx}-gender`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => (
                            <SelectItem key={g} value={g}>
                              {GENDER_LABELS[g]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`adult-${idx}-age`}>Age</Label>
                      <Input
                        id={`adult-${idx}-age`}
                        type="number"
                        min={18}
                        max={120}
                        value={adult.age}
                        onChange={(e) =>
                          updateAdult(idx, { age: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`adult-${idx}-address`}>
                      Residential Address *
                    </Label>
                    <Input
                      id={`adult-${idx}-address`}
                      placeholder="Street, City, Postal Code, Country"
                      value={adult.address}
                      onChange={(e) =>
                        updateAdult(idx, { address: e.target.value })
                      }
                      autoComplete="off"
                    />
                  </div>

                  {/* ID Photos Capture (Front & Back) */}
                  <div className="pt-2">
                    <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Government ID Verification (Photo Proof)
                    </Label>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">
                          ID Front
                        </span>
                        <PhotoInput
                          label="Capture ID Front"
                          hint="Driver license / Passport"
                          onChange={(file) =>
                            updateAdult(idx, { idPhotoFrontFile: file })
                          }
                        />
                      </div>

                      <div>
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">
                          ID Back
                        </span>
                        <PhotoInput
                          label="Capture ID Back"
                          hint="Back side of card"
                          onChange={(file) =>
                            updateAdult(idx, { idPhotoBackFile: file })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SECTION 3: CHILD GUESTS (DYNAMIC CARDS) */}
            {children.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users className="size-3.5" />
                  3. Child Guests ({children.length})
                </h3>

                {children.map((child, idx) => (
                  <div
                    key={idx}
                    className="space-y-3 rounded-xl border border-border bg-card p-3.5 shadow-sm"
                  >
                    <span className="text-sm font-semibold">
                      Child Guest #{idx + 1}
                    </span>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`child-${idx}-name`}>Child Name *</Label>
                        <Input
                          id={`child-${idx}-name`}
                          placeholder="Name"
                          value={child.name}
                          onChange={(e) =>
                            updateChild(idx, { name: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`child-${idx}-age`}>Age (&lt;18)</Label>
                        <Input
                          id={`child-${idx}-age`}
                          type="number"
                          min={0}
                          max={17}
                          value={child.age}
                          onChange={(e) =>
                            updateChild(idx, { age: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploadProgressText && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
                <Loader2 className="size-4 animate-spin" />
                <span>{uploadProgressText}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Processing…
                </>
              ) : isReservationCheckIn ? (
                "Complete Check In"
              ) : (
                "Check In Walk-In Guest"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
