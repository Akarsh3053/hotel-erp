"use client";

import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/validations/housekeeping";
import { TASK_STATUS_LABELS } from "@/lib/validations/housekeeping";

const statusStyles: Record<TaskStatus, string> = {
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  submitted: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        statusStyles[status],
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
