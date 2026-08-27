import Link from "next/link";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ClipboardList,
  Plus,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentMembership } from "@/lib/auth/rbac";
import { can, ROLE_LABELS, type PermissionAction } from "@/lib/auth/roles";

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
];

export default async function HomePage() {
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

  return (
    <>
      <PageHeader
        title={property.name}
        description={`Signed in as ${ROLE_LABELS[role]}`}
      />
      <div className="grid grid-cols-2 gap-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="block">
              <Card className="flex h-28 flex-col items-start justify-between p-4 transition-colors hover:bg-accent">
                <Icon className="size-6 text-muted-foreground" aria-hidden />
                <span className="text-sm font-medium">{item.label}</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
