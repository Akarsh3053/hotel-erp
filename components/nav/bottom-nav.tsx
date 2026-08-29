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
  Receipt,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { can, type PermissionAction, type Role } from "@/lib/auth/roles";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permission gating which roles see the tab. Omitted = always visible. */
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
    href: "/expenses",
    label: "Expenses",
    icon: Receipt,
    action: "expense:manage",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    action: "staff:manage",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ role, className }: { role: Role; className?: string }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => !item.action || can(role, item.action),
  );

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 [padding-bottom:env(safe-area-inset-bottom)]",
        className
      )}
    >
      <ul className="mx-auto flex max-w-screen-sm items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-5", active && "stroke-[2.25]")}
                  aria-hidden
                />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
