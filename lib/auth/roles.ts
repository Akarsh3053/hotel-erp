/**
 * App roles and the permission matrix mirroring spec §3.
 *
 * This is the single source of truth for "who can do what". It drives both
 * client-side UX gating (e.g. which bottom-nav tabs show) AND server-side
 * guards. Per spec §10, the server guard is the real one — the client checks
 * are cosmetic.
 */

export const ROLES = ["owner", "manager", "receptionist", "cleaner"] as const;
export type Role = (typeof ROLES)[number];

export type PermissionAction =
  | "property:create"
  | "property:delete"
  | "property:update"
  | "property:updatePhotos"
  | "staff:manage"
  | "roomType:manage"
  | "room:manage"
  | "checklist:manage"
  | "inventory:view"
  | "booking:manage"
  | "housekeeping:assign"
  | "housekeeping:viewAll"
  | "housekeeping:viewOwn"
  | "housekeeping:complete"
  | "housekeeping:review";

const PERMISSIONS: Record<PermissionAction, readonly Role[]> = {
  "property:create": ["owner"],
  "property:delete": ["owner"],
  "property:update": ["owner"],
  "property:updatePhotos": ["owner", "manager"],
  "staff:manage": ["owner", "manager"],
  "roomType:manage": ["owner", "manager"],
  "room:manage": ["owner", "manager"],
  "checklist:manage": ["owner", "manager"],
  "inventory:view": ["owner", "manager", "receptionist"],
  "booking:manage": ["owner", "manager", "receptionist"],
  "housekeeping:assign": ["owner", "manager"],
  "housekeeping:viewAll": ["owner", "manager"],
  "housekeeping:viewOwn": ["cleaner"],
  "housekeeping:complete": ["cleaner"],
  "housekeeping:review": ["owner", "manager"],
};

/** Whether a role is permitted to perform an action. */
export function can(
  role: Role | null | undefined,
  action: PermissionAction,
): boolean {
  if (!role) return false;
  return PERMISSIONS[action].includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  receptionist: "Receptionist",
  cleaner: "Cleaner",
};
