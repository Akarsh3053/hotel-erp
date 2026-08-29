"use client";

import { useState, useTransition } from "react";
import { UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { assignTask } from "@/app/(app)/housekeeping/actions";

export type CleanerOption = {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string | null;
};

export function AssignDialog({
  taskId,
  roomNumber,
  cleaners,
  open,
  onOpenChange,
}: {
  taskId: string;
  roomNumber: string;
  cleaners: CleanerOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedCleanerId, setSelectedCleanerId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleAssign() {
    if (!selectedCleanerId) return;
    startTransition(async () => {
      const result = await assignTask({ taskId, cleanerId: selectedCleanerId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Task assigned.`);
      setSelectedCleanerId("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader>
          <DialogTitle>Assign Room {roomNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Select a cleaner:</p>
          {cleaners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cleaners on staff.</p>
          ) : (
            <div className="space-y-1.5">
              {cleaners.map((c) => (
                <button
                  key={c.userId}
                  type="button"
                  onClick={() => setSelectedCleanerId(c.userId)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedCleanerId === c.userId
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  {c.name ?? c.email ?? "Unknown"}
                  {c.email && c.name && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({c.email})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedCleanerId || isPending}
            onClick={handleAssign}
          >
            {isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <UserCheck data-icon="inline-start" />
            )}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
