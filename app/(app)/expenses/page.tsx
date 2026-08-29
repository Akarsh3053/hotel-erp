import { desc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { ExpensesView } from "@/components/expenses/expenses-view";
import { db } from "@/lib/db";
import { expenses, users } from "@/lib/db/schema";
import { requireMembership } from "@/lib/auth/rbac";

export default async function ExpensesPage() {
  const { property } = await requireMembership(["owner", "manager"]);

  const rows = await db
    .select({
      id: expenses.id,
      title: expenses.title,
      amount: expenses.amount,
      receiptPublicId: expenses.receiptPublicId,
      createdAt: expenses.createdAt,
      createdByName: users.firstName,
    })
    .from(expenses)
    .leftJoin(users, eq(expenses.createdBy, users.id))
    .where(eq(expenses.propertyId, property.id))
    .orderBy(desc(expenses.createdAt));

  const expenseItems = rows.map((r) => ({
    ...r,
    createdByName: r.createdByName ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track property expenses and attach receipt photos."
      />
      <ExpensesView expenses={expenseItems} />
    </>
  );
}
