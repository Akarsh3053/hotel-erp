"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { requireMembership } from "@/lib/auth/rbac";
import type { ActionResult } from "@/lib/action-result";
import { deleteImage } from "@/lib/storage/cloudinary";

import { uploadImage, propertyObjectFolder } from "@/lib/storage/cloudinary";

const expenseSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
});

export async function createExpense(formData: FormData): Promise<ActionResult> {
  const input = {
    title: formData.get("title"),
    amount: formData.get("amount"),
  };
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const receiptFile = formData.get("receipt");

  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unauthorized" };
  }

  const { property, user } = membership;

  let publicId = null;

  if (receiptFile instanceof File && receiptFile.size > 0) {
    if (receiptFile.size > 5 * 1024 * 1024) {
      return { ok: false, error: "Receipt photo size must be less than 5MB" };
    }
    const buffer = Buffer.from(await receiptFile.arrayBuffer());
    // Cloudinary receipts is private just in case
    const folder = propertyObjectFolder(property.id, "expenses");
    const uploaded = await uploadImage(buffer, { folder, access: "authenticated" });
    publicId = uploaded.publicId;
  }

  try {
    await db.insert(expenses).values({
      propertyId: property.id,
      title: parsed.data.title,
      amount: String(parsed.data.amount),
      receiptPublicId: publicId,
      createdBy: user.id,
    });

    revalidatePath("/expenses");
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Failed to create expense" };
  }
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  let membership;
  try {
    membership = await requireMembership(["owner", "manager"]);
  } catch (error) {
    return { ok: false, error: "Unauthorized" };
  }

  const { property } = membership;

  try {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
      .limit(1);

    if (!expense || expense.propertyId !== property.id) {
      return { ok: false, error: "Expense not found" };
    }

    if (expense.receiptPublicId) {
      await deleteImage(expense.receiptPublicId);
    }

    await db.delete(expenses).where(eq(expenses.id, expenseId));

    revalidatePath("/expenses");
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Failed to delete expense" };
  }
}
