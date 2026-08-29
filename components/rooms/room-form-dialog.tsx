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
  createRoomSchema,
  ROOM_STATUS_LABELS,
  ROOM_STATUSES,
  type RoomStatus,
} from "@/lib/validations/room";
import { createRoom, updateRoom } from "@/app/(app)/rooms/actions";
import type { RoomTypeData } from "./room-type-form-dialog";

export type RoomData = {
  id: string;
  roomNumber: string;
  floor: string | null;
  roomTypeId: string;
  status: RoomStatus;
};

export function RoomFormDialog({
  open,
  onOpenChange,
  roomTypes,
  editingRoom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomTypes: RoomTypeData[];
  editingRoom?: RoomData | null;
}) {
  const router = useRouter();
  const isEditing = Boolean(editingRoom);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      roomNumber: "",
      floor: "",
      roomTypeId: roomTypes[0]?.id ?? "",
      status: "available" as RoomStatus,
    },
  });

  useEffect(() => {
    if (editingRoom) {
      reset({
        roomNumber: editingRoom.roomNumber,
        floor: editingRoom.floor ?? "",
        roomTypeId: editingRoom.roomTypeId,
        status: editingRoom.status,
      });
    } else {
      reset({
        roomNumber: "",
        floor: "",
        roomTypeId: roomTypes[0]?.id ?? "",
        status: "available",
      });
    }
  }, [editingRoom, roomTypes, reset, open]);

  const onSubmit = handleSubmit(async (values) => {
    const result = isEditing && editingRoom
      ? await updateRoom(editingRoom.id, values)
      : await createRoom(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Room updated" : "Room created");
    onOpenChange(false);
    reset();
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit room" : "Add room"}</DialogTitle>
            <DialogDescription>
              Assign a room number, floor, and link to a room type classification.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="room-number">Room number</Label>
                <Input
                  id="room-number"
                  placeholder="e.g. 101"
                  autoComplete="off"
                  aria-invalid={errors.roomNumber ? true : undefined}
                  {...register("roomNumber")}
                />
                {errors.roomNumber ? (
                  <p className="text-sm text-destructive">
                    {errors.roomNumber.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-floor">
                  Floor <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="room-floor"
                  placeholder="e.g. 1"
                  autoComplete="off"
                  aria-invalid={errors.floor ? true : undefined}
                  {...register("floor")}
                />
                {errors.floor ? (
                  <p className="text-sm text-destructive">{errors.floor.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-type">Room type</Label>
              <Controller
                name="roomTypeId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="room-type" className="w-full">
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name}{" "}
                          {rt.displayPrice ? `($${rt.displayPrice}/night)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.roomTypeId ? (
                <p className="text-sm text-destructive">
                  {errors.roomTypeId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="room-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_STATUSES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {ROOM_STATUS_LABELS[st]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status ? (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : isEditing
                ? "Save changes"
                : "Create room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
