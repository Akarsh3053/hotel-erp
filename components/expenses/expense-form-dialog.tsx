"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/dialog";
import { PhotoInput } from "@/components/media/photo-input";
import { createExpense } from "@/app/(app)/expenses/actions";

export function ExpenseFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formRef.current) return;

    const formData = new FormData(formRef.current);

    // Attach receipt if chosen
    if (receiptFile) {
      formData.set("receipt", receiptFile);
    } else {
      formData.delete("receipt");
    }

    setIsSubmitting(true);
    try {
      const result = await createExpense(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Expense recorded");
      onOpenChange(false);
      formRef.current?.reset();
      setReceiptFile(null);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a property expense. Attach a receipt photo for reference.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-title">Title *</Label>
              <Input
                id="expense-title"
                name="title"
                placeholder="e.g. Cleaning supplies"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount (₹) *</Label>
              <Input
                id="expense-amount"
                name="amount"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                Receipt Photo{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <PhotoInput
                label="Attach receipt"
                hint="Max 5 MB · JPG, PNG, WebP"
                capture="environment"
                onChange={setReceiptFile}
              />
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
                  Saving…
                </>
              ) : (
                "Add Expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
