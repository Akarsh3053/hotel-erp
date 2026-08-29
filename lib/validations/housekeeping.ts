import { z } from "zod";

export const TASK_STATUSES = [
  "assigned",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

export const assignTaskSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  cleanerId: z.string().min(1, "Select a cleaner"),
});
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;

export const toggleTaskItemSchema = z.object({
  taskItemId: z.string().uuid("Invalid item ID"),
});
export type ToggleTaskItemInput = z.infer<typeof toggleTaskItemSchema>;

export const submitTaskSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
});
export type SubmitTaskInput = z.infer<typeof submitTaskSchema>;

export const reviewTaskSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  action: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(500, "Notes too long").optional(),
});
export type ReviewTaskInput = z.infer<typeof reviewTaskSchema>;

export const checklistItemSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Item label is required")
    .max(200, "Label is too long"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const createTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Template name must be at least 2 characters")
    .max(100, "Name is too long"),
  defaultForRoomTypeId: z.string().uuid().optional().nullable(),
  items: z
    .array(checklistItemSchema)
    .min(1, "Add at least one checklist item")
    .max(50, "Too many items"),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  name: z
    .string()
    .trim()
    .min(2, "Template name must be at least 2 characters")
    .max(100, "Name is too long"),
  defaultForRoomTypeId: z.string().uuid().optional().nullable(),
  items: z
    .array(checklistItemSchema)
    .min(1, "Add at least one checklist item")
    .max(50, "Too many items"),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const deleteTemplateSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
});
export type DeleteTemplateInput = z.infer<typeof deleteTemplateSchema>;
