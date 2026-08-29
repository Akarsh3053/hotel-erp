"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  ClipboardList,
  Home,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { can, type PermissionAction, type Role } from "@/lib/auth/roles";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  action?: PermissionAction;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/rooms", label: "Rooms", icon: BedDouble, action: "inventory:view" },
  {
    href: "/bookings",
    label: "Bookings",
    icon: CalendarDays,
    action: "booking:manage",
  },
  {
    href: "/housekeeping",
    label: "Housekeeping",
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
    action: "staff:manage", // we might want property limits here too later
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ role, className }: { role: Role; className?: string }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.action || can(role, item.action));

  return (
    <nav className={cn("flex flex-col gap-1 p-4", className)}>
      <div className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Menu
      </div>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
