"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { deleteExpense } from "@/app/(app)/expenses/actions";

export type ExpenseItem = {
  id: string;
  title: string;
  amount: string;
  receiptPublicId: string | null;
  createdAt: Date;
  createdByName: string | null;
};

export function ExpensesView({ expenses }: { expenses: ExpenseItem[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteExpense(deleteTarget.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Expense deleted");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  const totalAmount = expenses.reduce(
    (acc, e) => acc + (Number(e.amount) || 0),
    0,
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""} &middot;{" "}
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>{" "}
            total
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus data-icon="inline-start" />
          Add Expense
        </Button>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Track property expenses like supplies, maintenance, and utilities."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Add First Expense
            </Button>
          }
        />
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{expense.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(expense.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {expense.createdByName ? ` · ${expense.createdByName}` : ""}
                  {expense.receiptPublicId ? " · Receipt attached" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-sm font-semibold text-rose-600 dark:text-rose-400">
                  ₹{Number(expense.amount).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(expense)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Delete expense</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ExpenseFormDialog open={addOpen} onOpenChange={setAddOpen} />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete expense?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.title}" (₹${Number(deleteTarget.amount).toLocaleString("en-IN")}) will be permanently removed.`
                : "This expense will be permanently removed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isDeleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
