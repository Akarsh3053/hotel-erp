"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteProperty } from "@/app/(app)/properties/actions";

/**
 * Owner-only, irreversible property deletion. Requires typing the property name
 * to confirm. On success we clear the active org client-side and return home.
 */
export function DangerZone({ propertyName }: { propertyName: string }) {
  const router = useRouter();
  const { setActive } = useClerk();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const matches = confirmText.trim() === propertyName.trim();

  async function onDelete() {
    if (!matches) return;
    setDeleting(true);
    const result = await deleteProperty();
    if (!result.ok) {
      setDeleting(false);
      toast.error(result.error);
      return;
    }
    try {
      await setActive({ organization: null });
    } catch {
      // Non-fatal — the shell re-resolves membership on next load.
    }
    toast.success("Property deleted");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-destructive/30 p-4">
      <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Deleting this property removes its rooms, bookings, staff access, and
        all related data. This can&apos;t be undone.
      </p>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o && !deleting) {
            setOpen(false);
            setConfirmText("");
          } else {
            setOpen(o);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" className="mt-4">
            Delete property
          </Button>
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete {propertyName}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the property and everything in it. Type
              the property name to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 space-y-2">
            <Label htmlFor="confirm-name" className="sr-only">
              Property name
            </Label>
            <Input
              id="confirm-name"
              autoComplete="off"
              placeholder={propertyName}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={deleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={!matches || deleting}
              onClick={onDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Deleting…
                </>
              ) : (
                "Delete permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
