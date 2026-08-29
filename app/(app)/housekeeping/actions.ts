"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  checklistTemplateItems,
  checklistTemplates,
  housekeepingTaskItems,
  housekeepingTasks,
  rooms,
  roomTypes,
} from "@/lib/db/schema";
import { requireMembership } from "@/lib/auth/rbac";
import type { ActionResult } from "@/lib/action-result";
import {
  assignTaskSchema,
  createTemplateSchema,
  deleteTemplateSchema,
  reviewTaskSchema,
  submitTaskSchema,
  toggleTaskItemSchema,
  updateTemplateSchema,
} from "@/lib/validations/housekeeping";

/* ---------------------------------------------------------------------------
 * Assign a task to a cleaner (manager/owner only)
 * ------------------------------------------------------------------------- */
export async function assignTask(input: unknown): Promise<ActionResult> {
  const parsed = assignTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { property, user } = membership;

  const [task] = await db
    .select({ id: housekeepingTasks.id, propertyId: housekeepingTasks.propertyId })
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, parsed.data.taskId))
    .limit(1);

  if (!task || task.propertyId !== property.id) {
    return { ok: false, error: "Task not found in this property" };
  }

  await db
    .update(housekeepingTasks)
    .set({
      assignedCleanerId: parsed.data.cleanerId,
      assignedBy: user.id,
      status: "assigned",
      updatedAt: new Date(),
    })
    .where(eq(housekeepingTasks.id, task.id));

  revalidatePath("/housekeeping");
  return { ok: true };
}

/* ---------------------------------------------------------------------------
 * Toggle a checklist item (cleaner only)
 * ------------------------------------------------------------------------- */
export async function toggleTaskItem(input: unknown): Promise<ActionResult> {
  const parsed = toggleTaskItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let membership;
  try {
    membership = await requireMembership(["cleaner"]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { property } = membership;

  const [item] = await db
    .select({
      id: housekeepingTaskItems.id,
      taskId: housekeepingTaskItems.taskId,
      isCompleted: housekeepingTaskItems.isCompleted,
    })
    .from(housekeepingTaskItems)
    .where(eq(housekeepingTaskItems.id, parsed.data.taskItemId))
    .limit(1);

  if (!item) {
    return { ok: false, error: "Item not found" };
  }

  const [task] = await db
    .select({
      id: housekeepingTasks.id,
      propertyId: housekeepingTasks.propertyId,
      assignedCleanerId: housekeepingTasks.assignedCleanerId,
      status: housekeepingTasks.status,
    })
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, item.taskId))
    .limit(1);

  if (!task || task.propertyId !== property.id) {
    return { ok: false, error: "Task not found in this property" };
  }

  const now = new Date();
  const nowCompleted = !item.isCompleted;

  await db
    .update(housekeepingTaskItems)
    .set({
      isCompleted: nowCompleted,
      completedAt: nowCompleted ? now : null,
    })
    .where(eq(housekeepingTaskItems.id, item.id));

  // Move task to in_progress when any item is checked
  if (task.status === "assigned") {
    await db
      .update(housekeepingTasks)
      .set({ status: "in_progress", updatedAt: now })
      .where(eq(housekeepingTasks.id, task.id));
  }

  revalidatePath("/housekeeping");
  return { ok: true };
}

/* ---------------------------------------------------------------------------
 * Submit a completed task for manager review (cleaner only)
 * ------------------------------------------------------------------------- */
export async function submitTask(input: unknown): Promise<ActionResult> {
  const parsed = submitTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let membership;
  try {
    membership = await requireMembership(["cleaner"]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { property } = membership;

  const [task] = await db
    .select({
      id: housekeepingTasks.id,
      propertyId: housekeepingTasks.propertyId,
      status: housekeepingTasks.status,
    })
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, parsed.data.taskId))
    .limit(1);

  if (!task || task.propertyId !== property.id) {
    return { ok: false, error: "Task not found in this property" };
  }

  if (task.status !== "in_progress" && task.status !== "assigned") {
    return { ok: false, error: `Cannot submit task with status: ${task.status}` };
  }

  await db
    .update(housekeepingTasks)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(housekeepingTasks.id, task.id));

  revalidatePath("/housekeeping");
  return { ok: true };
}

/* ---------------------------------------------------------------------------
 * Review a submitted task — approve or reject (manager/owner only)
 * Approve: room → available, task → approved
 * Reject:  room stays housekeeping, task → rejected (cleaner gets it back)
 * ------------------------------------------------------------------------- */
export async function reviewTask(input: unknown): Promise<ActionResult> {
  const parsed = reviewTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { property, user } = membership;

  const [task] = await db
    .select({
      id: housekeepingTasks.id,
      propertyId: housekeepingTasks.propertyId,
      roomId: housekeepingTasks.roomId,
      status: housekeepingTasks.status,
    })
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, parsed.data.taskId))
    .limit(1);

  if (!task || task.propertyId !== property.id) {
    return { ok: false, error: "Task not found in this property" };
  }

  if (task.status !== "submitted") {
    return { ok: false, error: `Task is not awaiting review (status: ${task.status})` };
  }

  const now = new Date();
  const { action, notes } = parsed.data;

  await db
    .update(housekeepingTasks)
    .set({
      status: action === "approve" ? "approved" : "rejected",
      reviewedAt: now,
      reviewedBy: user.id,
      reviewNotes: notes ?? null,
      updatedAt: now,
    })
    .where(eq(housekeepingTasks.id, task.id));

  if (action === "approve") {
    await db
      .update(rooms)
      .set({ status: "available", updatedAt: now })
      .where(eq(rooms.id, task.roomId));
  }

  revalidatePath("/housekeeping");
  revalidatePath("/rooms");
  revalidatePath("/");
  return { ok: true };
}

/* ---------------------------------------------------------------------------
 * Checklist Template CRUD (owner/manager only)
 * ------------------------------------------------------------------------- */
export async function createTemplate(input: unknown): Promise<ActionResult<{ templateId: string }>> {
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { property, user } = membership;

  const [template] = await db
    .insert(checklistTemplates)
    .values({
      propertyId: property.id,
      name: parsed.data.name,
      defaultForRoomTypeId: parsed.data.defaultForRoomTypeId ?? null,
      createdBy: user.id,
    })
    .returning({ id: checklistTemplates.id });

  for (let i = 0; i < parsed.data.items.length; i++) {
    const item = parsed.data.items[i];
    await db.insert(checklistTemplateItems).values({
      templateId: template.id,
      label: item.label,
      sortOrder: item.sortOrder ?? i,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/housekeeping");
  return { ok: true, templateId: template.id };
}

export async function updateTemplate(input: unknown): Promise<ActionResult> {
  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { property } = membership;

  const [existing] = await db
    .select({ id: checklistTemplates.id, propertyId: checklistTemplates.propertyId })
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, parsed.data.templateId))
    .limit(1);

  if (!existing || existing.propertyId !== property.id) {
    return { ok: false, error: "Template not found in this property" };
  }

  await db
    .update(checklistTemplates)
    .set({
      name: parsed.data.name,
      defaultForRoomTypeId: parsed.data.defaultForRoomTypeId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(checklistTemplates.id, existing.id));

  // Replace items in full
  await db
    .delete(checklistTemplateItems)
    .where(eq(checklistTemplateItems.templateId, existing.id));

  for (let i = 0; i < parsed.data.items.length; i++) {
    const item = parsed.data.items[i];
    await db.insert(checklistTemplateItems).values({
      templateId: existing.id,
      label: item.label,
      sortOrder: item.sortOrder ?? i,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/housekeeping");
  return { ok: true };
}

export async function deleteTemplate(input: unknown): Promise<ActionResult> {
  const parsed = deleteTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { property } = membership;

  const [existing] = await db
    .select({ id: checklistTemplates.id, propertyId: checklistTemplates.propertyId })
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, parsed.data.templateId))
    .limit(1);

  if (!existing || existing.propertyId !== property.id) {
    return { ok: false, error: "Template not found in this property" };
  }

  await db
    .delete(checklistTemplateItems)
    .where(eq(checklistTemplateItems.templateId, existing.id));

  await db
    .delete(checklistTemplates)
    .where(eq(checklistTemplates.id, existing.id));

  revalidatePath("/settings");
  revalidatePath("/settings/housekeeping");
  return { ok: true };
}

/* ---------------------------------------------------------------------------
 * Fetch helpers (used by page.tsx and settings page)
 * ------------------------------------------------------------------------- */
export async function getTemplatesForProperty(): Promise<ActionResult<{
  templates: Array<{
    id: string;
    name: string;
    defaultForRoomTypeId: string | null;
    itemCount: number;
  }>;
  roomTypes: Array<{ id: string; name: string }>;
}>> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { property } = membership;

  const rawTemplates = await db
    .select({
      id: checklistTemplates.id,
      name: checklistTemplates.name,
      defaultForRoomTypeId: checklistTemplates.defaultForRoomTypeId,
    })
    .from(checklistTemplates)
    .where(eq(checklistTemplates.propertyId, property.id));

  const allItems = await db
    .select({ templateId: checklistTemplateItems.templateId })
    .from(checklistTemplateItems);

  const countByTemplate = new Map<string, number>();
  for (const item of allItems) {
    countByTemplate.set(item.templateId, (countByTemplate.get(item.templateId) ?? 0) + 1);
  }

  const templates = rawTemplates.map((t) => ({
    ...t,
    itemCount: countByTemplate.get(t.id) ?? 0,
  }));

  const propertyRoomTypes = await db
    .select({ id: roomTypes.id, name: roomTypes.name })
    .from(roomTypes)
    .where(eq(roomTypes.propertyId, property.id));

  return { ok: true, templates, roomTypes: propertyRoomTypes };
}

export async function getTemplateWithItems(templateId: string): Promise<ActionResult<{
  id: string;
  name: string;
  defaultForRoomTypeId: string | null;
  items: Array<{ id: string; label: string; sortOrder: number }>;
}>> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { property } = membership;

  const [template] = await db
    .select({
      id: checklistTemplates.id,
      name: checklistTemplates.name,
      defaultForRoomTypeId: checklistTemplates.defaultForRoomTypeId,
      propertyId: checklistTemplates.propertyId,
    })
    .from(checklistTemplates)
    .where(and(eq(checklistTemplates.id, templateId), eq(checklistTemplates.propertyId, property.id)))
    .limit(1);

  if (!template) {
    return { ok: false, error: "Template not found" };
  }

  const items = await db
    .select({
      id: checklistTemplateItems.id,
      label: checklistTemplateItems.label,
      sortOrder: checklistTemplateItems.sortOrder,
    })
    .from(checklistTemplateItems)
    .where(eq(checklistTemplateItems.templateId, template.id))
    .orderBy(checklistTemplateItems.sortOrder);

  return { ok: true, id: template.id, name: template.name, defaultForRoomTypeId: template.defaultForRoomTypeId, items };
}
