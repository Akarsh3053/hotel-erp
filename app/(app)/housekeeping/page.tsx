import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { requireMembership } from "@/lib/auth/rbac";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  housekeepingTaskItems,
  housekeepingTaskPhotos,
  housekeepingTasks,
  propertyMembers,
  rooms,
  roomTypes,
  users,
} from "@/lib/db/schema";
import { PageHeader } from "@/components/page-header";
import { HousekeepingView } from "@/components/housekeeping/housekeeping-view";
import type { TaskDetailData } from "@/components/housekeeping/task-detail-dialog";
import type { TaskItemDetail, TaskPhotoDetail } from "@/components/housekeeping/task-detail-dialog";
import type { CleanerOption } from "@/components/housekeeping/assign-dialog";

export const metadata = { title: "Housekeeping" };

export default async function HousekeepingPage() {
  const membership = await requireMembership();
  const { property, role, user: currentUser } = membership;

  const isManager = can(role, "housekeeping:viewAll");
  const isCleaner = can(role, "housekeeping:viewOwn");

  // Fetch cleaners for assign dialog (manager/owner use)
  const cleaners: CleanerOption[] = isManager
    ? await db
        .select({
          membershipId: propertyMembers.id,
          userId: users.id,
          name: sql<string | null>`concat_ws(' ', ${users.firstName}, ${users.lastName})`,
          email: users.email,
        })
        .from(propertyMembers)
        .innerJoin(users, eq(propertyMembers.userId, users.id))
        .where(
          and(
            eq(propertyMembers.propertyId, property.id),
            eq(propertyMembers.role, "cleaner")
          )
        )
    : [];

  // Base query for tasks with room info, cleaner name, item counts, photo counts
  const taskQuery = db
    .select({
      id: housekeepingTasks.id,
      roomId: housekeepingTasks.roomId,
      roomNumber: rooms.roomNumber,
      roomTypeName: roomTypes.name,
      status: housekeepingTasks.status,
      assignedCleanerId: housekeepingTasks.assignedCleanerId,
      cleanerName: sql<string | null>`concat_ws(' ', ${users.firstName}, ${users.lastName})`,
      reviewNotes: housekeepingTasks.reviewNotes,
      createdAt: housekeepingTasks.createdAt,
      itemCount: sql<number>`coalesce(count(distinct ${housekeepingTaskItems.id}), 0)`,
      completedCount: sql<number>`coalesce(sum(case when ${housekeepingTaskItems.isCompleted} then 1 else 0 end), 0)`,
      photoCount: sql<number>`coalesce(count(distinct ${housekeepingTaskPhotos.id}), 0)`,
    })
    .from(housekeepingTasks)
    .innerJoin(rooms, eq(housekeepingTasks.roomId, rooms.id))
    .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
    .leftJoin(users, eq(housekeepingTasks.assignedCleanerId, users.id))
    .leftJoin(
      housekeepingTaskItems,
      eq(housekeepingTaskItems.taskId, housekeepingTasks.id)
    )
    .leftJoin(
      housekeepingTaskPhotos,
      eq(housekeepingTaskPhotos.taskId, housekeepingTasks.id)
    )
    .where(eq(housekeepingTasks.propertyId, property.id))
    .$dynamic();

  let allTasks: TaskDetailData[] = [];
  let reviewTasks: TaskDetailData[] = [];
  let ownTasks: TaskDetailData[] = [];

  if (isManager) {
    // Manager: fetch all tasks
    const rows = await taskQuery
      .groupBy(
        housekeepingTasks.id,
        rooms.roomNumber,
        roomTypes.name,
        users.id,
        users.firstName,
        users.lastName
      )
      .orderBy(desc(housekeepingTasks.createdAt));

    const taskIds = rows.map((r) => r.id);

    // Fetch items and photos for all tasks
    const [items, photos] = await Promise.all([
      taskIds.length
        ? db
            .select({
              taskId: housekeepingTaskItems.taskId,
              id: housekeepingTaskItems.id,
              label: housekeepingTaskItems.label,
              isCompleted: housekeepingTaskItems.isCompleted,
            })
            .from(housekeepingTaskItems)
            .where(inArray(housekeepingTaskItems.taskId, taskIds))
        : [],
      taskIds.length
        ? db
            .select({
              taskId: housekeepingTaskPhotos.taskId,
              id: housekeepingTaskPhotos.id,
              url: housekeepingTaskPhotos.photoUrl,
              uploadedAt: housekeepingTaskPhotos.uploadedAt,
            })
            .from(housekeepingTaskPhotos)
            .where(inArray(housekeepingTaskPhotos.taskId, taskIds))
            .orderBy(desc(housekeepingTaskPhotos.uploadedAt))
        : [],
    ]);

    const itemsMap = new Map<string, TaskItemDetail[]>();
    const photosMap = new Map<string, TaskPhotoDetail[]>();

    items.forEach((item) => {
      if (!itemsMap.has(item.taskId)) itemsMap.set(item.taskId, []);
      itemsMap.get(item.taskId)!.push(item);
    });

    photos.forEach((photo) => {
      if (!photosMap.has(photo.taskId)) photosMap.set(photo.taskId, []);
      photosMap.get(photo.taskId)!.push(photo);
    });

    allTasks = rows.map((r) => ({
      ...r,
      items: itemsMap.get(r.id) ?? [],
      photos: photosMap.get(r.id) ?? [],
    }));

    reviewTasks = allTasks.filter((t) => t.status === "submitted");
  } else if (isCleaner) {
    // Cleaner: fetch only tasks assigned to them
    const rows = await taskQuery
      .where(
        and(
          eq(housekeepingTasks.propertyId, property.id),
          eq(housekeepingTasks.assignedCleanerId, currentUser.id),
          inArray(housekeepingTasks.status, ["assigned", "in_progress", "submitted"])
        )
      )
      .groupBy(
        housekeepingTasks.id,
        rooms.roomNumber,
        roomTypes.name,
        users.id,
        users.firstName,
        users.lastName
      )
      .orderBy(desc(housekeepingTasks.createdAt));

    const taskIds = rows.map((r) => r.id);

    const [items, photos] = await Promise.all([
      taskIds.length
        ? db
            .select({
              taskId: housekeepingTaskItems.taskId,
              id: housekeepingTaskItems.id,
              label: housekeepingTaskItems.label,
              isCompleted: housekeepingTaskItems.isCompleted,
            })
            .from(housekeepingTaskItems)
            .where(inArray(housekeepingTaskItems.taskId, taskIds))
        : [],
      taskIds.length
        ? db
            .select({
              taskId: housekeepingTaskPhotos.taskId,
              id: housekeepingTaskPhotos.id,
              url: housekeepingTaskPhotos.photoUrl,
              uploadedAt: housekeepingTaskPhotos.uploadedAt,
            })
            .from(housekeepingTaskPhotos)
            .where(inArray(housekeepingTaskPhotos.taskId, taskIds))
            .orderBy(desc(housekeepingTaskPhotos.uploadedAt))
        : [],
    ]);

    const itemsMap = new Map<string, TaskItemDetail[]>();
    const photosMap = new Map<string, TaskPhotoDetail[]>();

    items.forEach((item) => {
      if (!itemsMap.has(item.taskId)) itemsMap.set(item.taskId, []);
      itemsMap.get(item.taskId)!.push(item);
    });

    photos.forEach((photo) => {
      if (!photosMap.has(photo.taskId)) photosMap.set(photo.taskId, []);
      photosMap.get(photo.taskId)!.push(photo);
    });

    ownTasks = rows.map((r) => ({
      ...r,
      items: itemsMap.get(r.id) ?? [],
      photos: photosMap.get(r.id) ?? [],
    }));
  }

  return (
    <>
      <PageHeader
        title="Housekeeping"
        description={
          isManager
            ? "Assign tasks, monitor progress, and review completed work."
            : "View and complete your assigned cleaning tasks."
        }
      />
      <HousekeepingView
        allTasks={allTasks}
        reviewTasks={reviewTasks}
        ownTasks={ownTasks}
        cleaners={cleaners}
        isManager={isManager}
      />
    </>
  );
}
