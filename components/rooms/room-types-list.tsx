"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Pencil, Trash2, Loader2, BedDouble } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteRoomType } from "@/app/(app)/rooms/actions";
import type { RoomTypeData } from "./room-type-form-dialog";

export function RoomTypesList({
  roomTypes,
  roomCountsByType,
  canManage,
  onEdit,
}: {
  roomTypes: RoomTypeData[];
  roomCountsByType: Record<string, number>;
  canManage: boolean;
  onEdit: (rt: RoomTypeData) => void;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<RoomTypeData | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteRoomType(deleteTarget.id);
    setDeleting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Room type "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
    router.refresh();
  }

  if (roomTypes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center">
        <BedDouble className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">No room types defined yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create room types like &ldquo;Deluxe&rdquo; or &ldquo;Suite&rdquo; before adding rooms.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {roomTypes.map((rt) => {
          const count = roomCountsByType[rt.id] ?? 0;
          return (
            <Card key={rt.id} className="p-4 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">{rt.name}</h3>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {count} {count === 1 ? "room" : "rooms"}
                    </span>
                  </div>

                  {rt.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {rt.description}
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(rt)}
                      aria-label={`Edit ${rt.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(rt)}
                      aria-label={`Delete ${rt.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  <span>Max {rt.maxOccupancy ?? 2} guests</span>
                </div>

                {rt.displayPrice ? (
                  <span className="font-semibold text-foreground">
                    ${rt.displayPrice}
                    <span className="font-normal text-muted-foreground">/night</span>
                  </span>
                ) : (
                  <span>No price set</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              {deleteTarget && (roomCountsByType[deleteTarget.id] ?? 0) > 0 ? (
                <span className="text-destructive font-medium">
                  Cannot delete: {roomCountsByType[deleteTarget.id]} room(s) are
                  currently assigned to this room type. Reassign or delete those
                  rooms first.
                </span>
              ) : (
                "This room type classification will be permanently removed."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deleting ||
                Boolean(deleteTarget && (roomCountsByType[deleteTarget.id] ?? 0) > 0)
              }
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Deleting…
                </>
              ) : (
                "Delete Room Type"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
