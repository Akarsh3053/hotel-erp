"use client";

import { useRef, useState, useTransition } from "react";
import {
  CheckSquare,
  Square,
  Camera,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Send,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskStatusBadge } from "./task-status-badge";
import type { HousekeepingTaskSummary } from "./task-card";
import type { CleanerOption } from "./assign-dialog";
import { AssignDialog } from "./assign-dialog";
import {
  toggleTaskItem,
  submitTask,
  reviewTask,
  forceRoomAvailable,
} from "@/app/(app)/housekeeping/actions";

export type TaskItemDetail = {
  id: string;
  label: string;
  isCompleted: boolean;
};

export type TaskPhotoDetail = {
  id: string;
  url: string;
  uploadedAt: string | Date;
};

export type TaskDetailData = HousekeepingTaskSummary & {
  items: TaskItemDetail[];
  photos: TaskPhotoDetail[];
  reviewNotes: string | null;
};

function ChecklistSection({
  items,
  disabled,
}: {
  items: TaskItemDetail[];
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle(taskItemId: string) {
    startTransition(async () => {
      const result = await toggleTaskItem({ taskItemId });
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={disabled || pending}
          onClick={() => toggle(item.id)}
          className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/30 disabled:opacity-60"
        >
          {item.isCompleted ? (
            <CheckSquare className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <Square className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className={item.isCompleted ? "line-through text-muted-foreground" : ""}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function PhotoUploadSection({
  taskId,
  photos,
  disabled,
}: {
  taskId: string;
  photos: TaskPhotoDetail[];
  disabled: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5 MB)");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG and WebP accepted");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("photo", file);

    try {
      const res = await fetch(`/api/housekeeping/${taskId}/photos`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Upload failed");
      toast.success("Photo uploaded");
      // The page will be revalidated server-side; refresh to pick up new photo
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={p.id}
              src={p.url}
              alt="Proof"
              className="aspect-square w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}
      {!disabled && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Camera data-icon="inline-start" />
            )}
            {uploading ? "Uploading…" : "Add Photo"}
          </Button>
        </>
      )}
    </div>
  );
}

function ReviewPanel({ taskId }: { taskId: string }) {
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleReview(action: "approve" | "reject") {
    startTransition(async () => {
      const result = await reviewTask({ taskId, action, notes: notes.trim() || undefined });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(action === "approve" ? "Task approved — room set to Available." : "Task rejected.");
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Manager Review
      </p>
      <textarea
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Review notes (optional)…"
        rows={3}
        maxLength={500}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 text-destructive hover:bg-destructive/10"
          disabled={isPending}
          onClick={() => handleReview("reject")}
        >
          {isPending ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <ThumbsDown data-icon="inline-start" />
          )}
          Reject
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={isPending}
          onClick={() => handleReview("approve")}
        >
          {isPending ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <ThumbsUp data-icon="inline-start" />
          )}
          Approve
        </Button>
      </div>
    </div>
  );
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  isManager,
  cleaners,
}: {
  task: TaskDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isManager: boolean;
  cleaners: CleanerOption[];
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [submitPending, startSubmitTransition] = useTransition();

  if (!task) return null;

  const canAct =
    !isManager &&
    (task.status === "assigned" || task.status === "in_progress");
  const canSubmit = canAct;
  const canReview = isManager && task.status === "submitted";
  const canAssign =
    isManager &&
    (task.status === "assigned" ||
      task.status === "rejected" ||
      task.status === "in_progress");
  const canForceAvailable = isManager && task.status !== "approved";

  function handleSubmit() {
    startSubmitTransition(async () => {
      const result = await submitTask({ taskId: task!.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Task submitted for review.");
    });
  }

  const [forcePending, startForceTransition] = useTransition();

  function handleForceAvailable() {
    startForceTransition(async () => {
      const result = await forceRoomAvailable(task!.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Room marked as available");
      onOpenChange(false);
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-4 lg:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-4">
              <DialogTitle className="text-base">
                Room {task.roomNumber} · {task.roomTypeName}
              </DialogTitle>
              <TaskStatusBadge status={task.status} />
            </div>
            {task.cleanerName && (
              <p className="text-xs text-muted-foreground">
                Cleaner: {task.cleanerName}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Checklist */}
            {task.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Checklist ({task.completedCount}/{task.itemCount})
                </p>
                <ChecklistSection
                  items={task.items}
                  disabled={!canAct}
                />
              </div>
            )}

            {/* Photo proof */}
            {(task.photos.length > 0 || canAct) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Proof Photos ({task.photos.length})
                </p>
                <PhotoUploadSection
                  taskId={task.id}
                  photos={task.photos}
                  disabled={!canAct}
                />
              </div>
            )}

            {/* Review notes (for cleaner to see) */}
            {task.reviewNotes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                <p className="font-semibold text-amber-800">Manager Notes:</p>
                <p className="mt-0.5 text-amber-700">{task.reviewNotes}</p>
              </div>
            )}

            {/* Manager assign button */}
            {canAssign && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setAssignOpen(true)}
              >
                <UserCheck data-icon="inline-start" />
                {task.status === "rejected" ? "Reassign Cleaner" : "Assign Cleaner"}
              </Button>
            )}

            {/* Manager force override */}
            {canForceAvailable && !canReview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                disabled={forcePending}
                onClick={handleForceAvailable}
              >
                {forcePending ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <ThumbsUp data-icon="inline-start" />
                )}
                Mark Room Available (Override)
              </Button>
            )}

            {/* Cleaner: submit */}
            {canSubmit && (
              <Button
                type="button"
                size="sm"
                className="w-full bg-purple-600 text-white hover:bg-purple-700"
                disabled={submitPending}
                onClick={handleSubmit}
              >
                {submitPending ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Send data-icon="inline-start" />
                )}
                Submit for Review
              </Button>
            )}

            {/* Manager review panel */}
            {canReview && <ReviewPanel taskId={task.id} />}
          </div>
        </DialogContent>
      </Dialog>

      {canAssign && (
        <AssignDialog
          taskId={task.id}
          roomNumber={task.roomNumber}
          cleaners={cleaners}
          open={assignOpen}
          onOpenChange={setAssignOpen}
        />
      )}
    </>
  );
}
