import { z } from "zod";

export const ROOM_STATUSES = [
  "available",
  "reserved",
  "occupied",
  "housekeeping",
] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  housekeeping: "Housekeeping",
};

const roomTypeName = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name is too long");

const roomTypeDescription = z
  .string()
  .trim()
  .max(500, "Description is too long")
  .optional();

const displayPrice = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z
    .coerce.number({ error: "Enter a valid price" })
    .min(0, "Price cannot be negative")
    .max(1000000, "Price is too high")
    .optional(),
);

const maxOccupancy = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z
    .coerce.number({ error: "Enter a number" })
    .int("Enter a whole number")
    .min(1, "Must accommodate at least 1 person")
    .max(50, "Max occupancy seems too high")
    .optional(),
);

export const PRICING_TYPES = ["fixed", "flexi"] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

export const createRoomTypeSchema = z.object({
  name: roomTypeName,
  description: roomTypeDescription,
  pricingType: z.enum(PRICING_TYPES).default("fixed"),
  displayPrice,
  maxOccupancy,
});
export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;

export const updateRoomTypeSchema = createRoomTypeSchema;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;

const roomNumber = z
  .string()
  .trim()
  .min(1, "Room number is required")
  .max(20, "Room number is too long");

const floor = z
  .string()
  .trim()
  .max(20, "Floor name is too long")
  .optional();

export const createRoomSchema = z.object({
  roomNumber,
  floor,
  roomTypeId: z.string().uuid("Please select a room type"),
  status: z.enum(ROOM_STATUSES, { error: "Select a valid status" }).default("available"),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z.object({
  roomNumber,
  floor,
  roomTypeId: z.string().uuid("Please select a room type"),
  status: z.enum(ROOM_STATUSES, { error: "Select a valid status" }),
});
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const updateRoomStatusSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  status: z.enum(ROOM_STATUSES, { error: "Select a valid status" }),
});
export type UpdateRoomStatusInput = z.infer<typeof updateRoomStatusSchema>;
