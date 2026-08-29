"use client";

import { Bed, User } from "lucide-react";

import { TaskStatusBadge } from "./task-status-badge";
import type { TaskStatus } from "@/lib/validations/housekeeping";

export type HousekeepingTaskSummary = {
  id: string;
  roomNumber: string;
  roomTypeName: string;
  status: TaskStatus;
  cleanerName: string | null;
  itemCount: number;
  completedCount: number;
  photoCount: number;
  createdAt: string | Date;
};

export function TaskCard({
  task,
  onClick,
}: {
  task: HousekeepingTaskSummary;
  onClick: (task: HousekeepingTaskSummary) => void;
}) {
  const pct =
    task.itemCount > 0
      ? Math.round((task.completedCount / task.itemCount) * 100)
      : 0;

  return (
    <button
      type="button"
      className="w-full rounded-xl border border-border bg-card p-3.5 text-left shadow-xs transition-shadow hover:shadow-sm active:scale-[0.99]"
      onClick={() => onClick(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold text-sm leading-tight">
              Room {task.roomNumber}
            </p>
            <p className="text-xs text-muted-foreground">{task.roomTypeName}</p>
          </div>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      {task.cleanerName && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="size-3.5" />
          <span>{task.cleanerName}</span>
        </div>
      )}

      {task.itemCount > 0 && (
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {task.completedCount}/{task.itemCount} items
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}
