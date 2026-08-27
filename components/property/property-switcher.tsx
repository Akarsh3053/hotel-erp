"use client";

import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

type SwitchableProperty = { orgId: string; name: string; role: Role };

/**
 * Header property switcher. A user may own/work at several properties; picking
 * one calls Clerk `setActive` to change the session's active org, then refreshes
 * so server components re-resolve membership for the new tenant.
 */
export function PropertySwitcher({
  activeOrgId,
  activeName,
  activeRole,
  properties,
}: {
  activeOrgId: string | null;
  activeName: string;
  activeRole: Role;
  properties: SwitchableProperty[];
}) {
  const router = useRouter();
  const { setActive } = useClerk();

  async function switchTo(orgId: string) {
    if (orgId === activeOrgId) return;
    try {
      await setActive({ organization: orgId });
      router.refresh();
    } catch {
      toast.error("Couldn't switch property. Try again.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="-ml-2 flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold leading-tight">
              {activeName}
            </span>
            <span className="text-xs leading-tight text-muted-foreground">
              {ROLE_LABELS[activeRole]}
            </span>
          </span>
          <ChevronsUpDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuLabel>Properties</DropdownMenuLabel>
        {properties.map((p) => (
          <DropdownMenuItem
            key={p.orgId}
            className="gap-2"
            onSelect={() => switchTo(p.orgId)}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[p.role]}
              </span>
            </span>
            {p.orgId === activeOrgId ? (
              <Check className="size-4 shrink-0" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/properties/new")}>
          <Plus className="size-4" aria-hidden />
          Create property
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
