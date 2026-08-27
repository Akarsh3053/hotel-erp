import { z } from "zod";

/**
 * Validation schemas for property + staff management (spec §3/§4).
 *
 * Shared by client forms (react-hook-form resolver) and the server actions in
 * `app/(app)/properties/actions.ts` / `app/(app)/settings/actions.ts`. The
 * server always re-validates — client validation is UX only (spec §10).
 */

/**
 * Roles an owner/manager may assign when inviting staff. "owner" is never
 * invitable — ownership is established only by creating a property.
 */
export const INVITABLE_ROLES = ["manager", "receptionist", "cleaner"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

const name = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(120, "Name is too long");

// Optional free text. An empty string is allowed and normalized to null by the
// action before it hits the database.
const address = z.string().trim().max(300, "Address is too long").optional();

// The form sends a string (or ""); coerce to an int and treat blank as absent.
const totalRooms = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce
    .number({ error: "Enter a number" })
    .int("Enter a whole number")
    .min(1, "Must be at least 1")
    .max(2000, "That seems too high")
    .optional(),
);

export const createPropertySchema = z.object({
  name,
  address,
  totalRooms,
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

// Same editable fields as creation (org + ownership are immutable here).
export const updatePropertySchema = z.object({
  name,
  address,
  totalRooms,
});
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export const inviteStaffSchema = z.object({
  // Normalize before validating so "  Foo@BAR.com " → "foo@bar.com".
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address")),
  role: z.enum(INVITABLE_ROLES, { error: "Choose a role" }),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
