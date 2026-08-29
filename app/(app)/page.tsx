import Link from "next/link";
import { eq, and, gte } from "drizzle-orm";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ClipboardList,
  Plus,
  Settings,
  Sparkles,
  DollarSign,
  TrendingUp,
  Receipt,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TimeframeToggle } from "@/components/dashboard/timeframe-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { rooms, bookings, expenses } from "@/lib/db/schema";
import { getCurrentMembership } from "@/lib/auth/rbac";
import { can, ROLE_LABELS, type PermissionAction } from "@/lib/auth/roles";
import type { RoomStatus } from "@/lib/validations/room";

const QUICK_ACTIONS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  action: PermissionAction;
}> = [
  { href: "/rooms", label: "Rooms", icon: BedDouble, action: "inventory:view" },
  {
    href: "/bookings",
    label: "Bookings",
    icon: CalendarDays,
    action: "booking:manage",
  },
  {
    href: "/housekeeping",
    label: "Cleaning",
    icon: Sparkles,
    action: "housekeeping:viewAll",
  },
  {
    href: "/tasks",
    label: "My Tasks",
    icon: ClipboardList,
    action: "housekeeping:viewOwn",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    action: "staff:manage",
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Receipt,
    action: "expense:manage",
  },
];

export default async function HomePage(props: {
  searchParams: Promise<{ timeframe?: string }>;
}) {
  const searchParams = await props.searchParams;
  const membership = await getCurrentMembership();

  if (!membership) {
    return (
      <>
        <PageHeader
          title="Welcome"
          description="Let's get your first property set up."
        />
        <EmptyState
          icon={Building2}
          title="No property yet"
          description="Create your first property to start managing rooms, bookings, and staff. You'll be its owner."
          action={
            <Button asChild size="lg">
              <Link href="/properties/new">
                <Plus data-icon="inline-start" />
                Create property
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const { role, property } = membership;
  const actions = QUICK_ACTIONS.filter((item) => can(role, item.action));
  const canViewRooms = can(role, "inventory:view");

  const roomStats: Record<RoomStatus, number> = {
    available: 0,
    reserved: 0,
    occupied: 0,
    housekeeping: 0,
  };
  let totalRooms = 0;

  if (canViewRooms) {
    const propertyRooms = await db
      .select({ status: rooms.status })
      .from(rooms)
      .where(eq(rooms.propertyId, property.id));

    totalRooms = propertyRooms.length;
    for (const r of propertyRooms) {
      roomStats[r.status] = (roomStats[r.status] ?? 0) + 1;
    }
  }

  // Dashboard Stats for Owner
  let currentPeriodBookingsCount = 0;
  let currentPeriodRevenue = 0;
  let currentPeriodExpenses = 0;

  if (role === "owner") {
    const now = new Date();
    // Use startOfDay or startOfMonth based on timeframe parameter
    const startDate = searchParams.timeframe === "today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const periodBookings = await db
      .select({
        totalPrice: bookings.totalPrice,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, property.id),
          gte(bookings.createdAt, startDate)
        )
      );

    currentPeriodBookingsCount = periodBookings.length;
    currentPeriodRevenue = periodBookings.reduce(
      (acc, b) => acc + (b.totalPrice ? Number(b.totalPrice) : 0),
      0
    );

    const periodExpenses = await db
      .select({
        amount: expenses.amount,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.propertyId, property.id),
          gte(expenses.createdAt, startDate)
        )
      );

    currentPeriodExpenses = periodExpenses.reduce(
      (acc, e) => acc + (e.amount ? Number(e.amount) : 0),
      0
    );
  }

  return (
    <>
      <PageHeader
        title={property.name}
        description={`Signed in as ${ROLE_LABELS[role]}`}
      />

      <div className="space-y-5">
        {/* Revenue & Booking Dashboard (owner only) */}
        {role === "owner" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Performance
              </h2>
            </div>

            <TimeframeToggle />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Card className="flex flex-col p-4 shadow-sm border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 transition-colors">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Revenue</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  ₹{currentPeriodRevenue.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </Card>

              <Card className="flex flex-col p-4 shadow-sm border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 transition-colors">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <TrendingUp className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Bookings</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {currentPeriodBookingsCount}
                </div>
              </Card>

              <Card className="flex flex-col p-4 shadow-sm border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 transition-colors col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <Receipt className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Expenses</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-300">
                  ₹{currentPeriodExpenses.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </Card>
            </div>
          </section>
        )}

        {/* Live inventory status summary (receptionist, manager, owner) */}
        {canViewRooms && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Room Status ({totalRooms})
              </h2>
              <Link
                href="/rooms"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Manage &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Available
                </span>
                <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                  {roomStats.available}
                </p>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 dark:bg-sky-500/10">
                <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  Reserved
                </span>
                <p className="mt-1 text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-300">
                  {roomStats.reserved}
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 dark:bg-amber-500/10">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Occupied
                </span>
                <p className="mt-1 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
                  {roomStats.occupied}
                </p>
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 dark:bg-purple-500/10">
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  Housekeeping
                </span>
                <p className="mt-1 text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-300">
                  {roomStats.housekeeping}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Quick action grid */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="block">
                  <Card className="flex h-24 flex-col items-start justify-between p-3.5 transition-colors hover:bg-accent">
                    <Icon className="size-5 text-muted-foreground" aria-hidden />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
