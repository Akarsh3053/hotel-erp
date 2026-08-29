"use client";

import { useState } from "react";
import { ClipboardList, CheckCircle, AlertCircle, User } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCard } from "./task-card";
import { TaskDetailDialog } from "./task-detail-dialog";
import type { TaskDetailData } from "./task-detail-dialog";
import type { HousekeepingTaskSummary } from "./task-card";
import type { CleanerOption } from "./assign-dialog";
import { EmptyState } from "@/components/empty-state";

export function HousekeepingView({
  allTasks,
  reviewTasks,
  ownTasks,
  cleaners,
  isManager,
}: {
  allTasks: HousekeepingTaskSummary[];
  reviewTasks: HousekeepingTaskSummary[];
  ownTasks: HousekeepingTaskSummary[];
  cleaners: CleanerOption[];
  isManager: boolean;
}) {
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [detailTask, setDetailTask] = useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const tasks =
    selectedTab === "review"
      ? reviewTasks
      : selectedTab === "mine"
        ? ownTasks
        : allTasks;

  function openDetail(task: HousekeepingTaskSummary) {
    // Hydrate full detail from the task list (items, photos, etc come from the same query)
    // Cast since the summary is part of the detail type
    setDetailTask(task as TaskDetailData);
    setDetailOpen(true);
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <EmptyState
          icon={
            isManager ? ClipboardList : User
          }
          title={isManager ? "No housekeeping tasks" : "No tasks assigned"}
          description={
            isManager
              ? "Tasks will appear here when rooms need cleaning."
              : "You have no pending housekeeping tasks."
          }
        />
      </div>
    );
  }

  return (
    <>
      {isManager && (
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">
              All Tasks ({allTasks.length})
            </TabsTrigger>
            <TabsTrigger value="review" className="text-xs">
              <AlertCircle className="mr-1.5 size-3.5" />
              Review ({reviewTasks.length})
            </TabsTrigger>
            <TabsTrigger value="mine" className="text-xs">
              <User className="mr-1.5 size-3.5" />
              My Team ({ownTasks.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {!isManager && ownTasks.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CheckCircle className="size-4 text-emerald-600" />
          Your assigned tasks
        </div>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={openDetail} />
        ))}
      </div>

      <TaskDetailDialog
        task={detailTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isManager={isManager}
        cleaners={cleaners}
      />
    </>
  );
}