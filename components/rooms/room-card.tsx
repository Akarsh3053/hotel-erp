"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, MoreVertical, Pencil, Trash2, Loader2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoomStatusBadge } from "./room-status-badge";
import {
  ROOM_STATUS_LABELS,
  ROOM_STATUSES,
  type RoomStatus,
} from "@/lib/validations/room";
import { deleteRoom, updateRoomStatus } from "@/app/(app)/rooms/actions";
import type { RoomData } from "./room-form-dialog";
import type { RoomTypeData } from "./room-type-form-dialog";

export function RoomCard({
  room,
  roomType,
  canManageRooms,
  canManageStatus,
  onEdit,
}: {
  room: RoomData;
  roomType?: RoomTypeData;
  canManageRooms: boolean;
  canManageStatus: boolean;
  onEdit: (room: RoomData) => void;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  async function handleStatusChange(nextStatus: RoomStatus) {
    if (nextStatus === room.status) return;
    setStatusUpdating(true);
    const result = await updateRoomStatus({
      roomId: room.id,
      status: nextStatus,
    });
    setStatusUpdating(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Room ${room.roomNumber} set to ${ROOM_STATUS_LABELS[nextStatus]}`);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteRoom(room.id);
    setDeleting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Room ${room.roomNumber} deleted`);
    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <>
      <Card className="p-4 transition-all hover:ring-foreground/20">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">
                {room.roomNumber}
              </span>
              {room.floor ? (
                <span className="text-xs text-muted-foreground">
                  Floor {room.floor}
                </span>
              ) : null}
            </div>

            <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground">
              {roomType?.name ?? "Standard"}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <RoomStatusBadge status={room.status} />

            {(canManageStatus || canManageRooms) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="-mr-2">
                    {statusUpdating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MoreVertical className="size-4" />
                    )}
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canManageStatus && (
                    <>
                      <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
                        <ArrowRightLeft className="size-3.5" />
                        Change Status
                      </DropdownMenuLabel>
                      {ROOM_STATUSES.map((st) => (
                        <DropdownMenuItem
                          key={st}
                          disabled={st === room.status || statusUpdating}
                          onSelect={() => handleStatusChange(st)}
                          className="text-xs"
                        >
                          Mark as {ROOM_STATUS_LABELS[st]}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {canManageRooms && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onEdit(room)}>
                        <Pencil className="size-4" />
                        Edit Room
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="size-4" />
                        Delete Room
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="size-3.5" />
            <span>Up to {roomType?.maxOccupancy ?? 2} guests</span>
          </div>

          {roomType?.displayPrice ? (
            <span className="font-semibold text-foreground">
              ${roomType.displayPrice}
              <span className="font-normal text-muted-foreground">/night</span>
            </span>
          ) : (
            <span>—</span>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Room {room.roomNumber}?</DialogTitle>
            <DialogDescription>
              This room will be permanently removed from inventory. Associated
              historical bookings and tasks will remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Deleting…
                </>
              ) : (
                "Delete Room"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
