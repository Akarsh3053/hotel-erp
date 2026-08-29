import { z } from "zod";

export const GUEST_TYPES = ["adult", "child"] as const;
export type GuestType = (typeof GUEST_TYPES)[number];

export const GENDERS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export const BOOKING_STATUSES = [
  "reserved",
  "checked_in",
  "checked_out",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  reserved: "Reserved",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
};

export const BOOKING_TYPES = ["hourly", "nightly", "dates"] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const PRICING_TYPES = ["fixed", "flexi"] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

const optionalGuestName = z.string().trim().max(100, "Name is too long");
const optionalGuestAddress = z.string().trim().max(300, "Address is too long");
const optionalAdultAge = z.coerce
  .number({ error: "Enter a valid age" })
  .int("Enter a whole number")
  .min(18, "Adult must be 18 or older")
  .max(120, "Age seems invalid")
  .optional();
const optionalChildAge = z.coerce
  .number({ error: "Enter a valid age" })
  .int("Enter a whole number")
  .min(0, "Age cannot be negative")
  .max(17, "Child must be under 18")
  .optional();
const optionalPhoneNumber = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^\+?[0-9\s\-()]{7,20}$/.test(value),
    "Enter a valid phone number",
  );

/**
 * A guest form can be empty for companions. `checkIn*Schema` applies the
 * stricter primary-guest requirements after it verifies the primary marker.
 */
export const adultGuestSchema = z.object({
  name: optionalGuestName,
  address: optionalGuestAddress,
  gender: z.enum(GENDERS).optional(),
  age: optionalAdultAge,
  contact: optionalPhoneNumber,
  idPhotoFront: z.string().optional().nullable(),
  idPhotoBack: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
});
export type AdultGuestInput = z.infer<typeof adultGuestSchema>;

export const childGuestSchema = z.object({
  name: optionalGuestName,
  gender: z.enum(GENDERS).optional(),
  age: optionalChildAge,
});
export type ChildGuestInput = z.infer<typeof childGuestSchema>;

function hasValidPrimaryGuest(adults: Array<z.infer<typeof adultGuestSchema>>) {
  const primary = adults.find((adult) => adult.isPrimary);
  if (!primary) return false;

  return (
    primary.name.length >= 2 &&
    primary.address.length >= 5 &&
    Boolean(primary.gender) &&
    primary.age !== undefined &&
    primary.contact.length > 0 &&
    /^\+?[0-9\s\-()]{7,20}$/.test(primary.contact)
  );
}

/**
 * Advance reservation creation (spec §7/§9)
 */
export const createReservationSchema = z
  .object({
    roomId: z.string().uuid("Select a room"),
    bookingType: z.enum(BOOKING_TYPES).default("nightly"),
    scheduledCheckInAt: z.string().min(1, "Select a check-in date"),
    scheduledCheckOutAt: z.string().optional().nullable(),
    durationNights: z.coerce
      .number({ error: "Enter duration" })
      .int()
      .min(1, "Minimum 1")
      .max(300, "Duration is too long")
      .optional(),
    totalPrice: z.coerce.number().optional().nullable(),
    adultCount: z.coerce
      .number()
      .int()
      .min(1, "At least 1 adult")
      .max(10, "Maximum 10 adults")
      .default(1),
    childCount: z.coerce
      .number()
      .int()
      .min(0)
      .max(10, "Maximum 10 children")
      .default(0),
    primaryGuestName: z
      .string()
      .trim()
      .min(2, "Guest name must be at least 2 characters")
      .max(100, "Guest name is too long"),
    primaryGuestContact: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid phone number"),
  })
  .refine((data) => data.bookingType !== "dates" || Boolean(data.scheduledCheckOutAt), {
    message: "Select a check-out date",
    path: ["scheduledCheckOutAt"],
  })
  .refine(
    (data) => {
      if (data.bookingType !== "dates" || !data.scheduledCheckOutAt) return true;
      return new Date(data.scheduledCheckOutAt) > new Date(data.scheduledCheckInAt);
    },
    {
      message: "Check-out date must be after check-in date",
      path: ["scheduledCheckOutAt"],
    },
  );
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

/**
 * Walk-in check-in schema with full dynamic guest capture (spec §8)
 */
export const checkInWalkInSchema = z
  .object({
    roomId: z.string().uuid("Select a room"),
    bookingType: z.enum(BOOKING_TYPES).default("nightly"),
    scheduledCheckInAt: z.string().optional().nullable(),
    scheduledCheckOutAt: z.string().optional().nullable(),
    durationNights: z.coerce
      .number({ error: "Enter duration" })
      .int()
      .min(1, "Minimum 1")
      .max(300, "Maximum limit reached")
      .optional(),
    totalPrice: z.coerce.number().optional().nullable(),
    adultCount: z.coerce
      .number()
      .int()
      .min(1, "At least 1 adult")
      .max(10, "Maximum 10 adults"),
    childCount: z.coerce
      .number()
      .int()
      .min(0)
      .max(10, "Maximum 10 children")
      .default(0),
    adults: z.array(adultGuestSchema).min(1, "At least one adult is required"),
    children: z.array(childGuestSchema).default([]),
  })
  .refine((data) => data.adults.length === data.adultCount, {
    message: "Number of adult forms must match the adult count",
    path: ["adults"],
  })
  .refine((data) => data.children.length === data.childCount, {
    message: "Number of child forms must match the child count",
    path: ["children"],
  })
  .refine(
    (data) => data.adults.filter((a) => a.isPrimary).length === 1,
    {
      message: "Exactly one adult guest must be marked as the primary guest",
      path: ["adults"],
    },
  )
  .refine((data) => hasValidPrimaryGuest(data.adults), {
    message: "Primary guest needs a name, phone number, address, gender, and valid adult age",
    path: ["adults"],
  })
  .refine((data) => data.bookingType !== "dates" || Boolean(data.scheduledCheckOutAt), {
    message: "Select a check-out date",
    path: ["scheduledCheckOutAt"],
  })
  .refine(
    (data) => {
      if (data.bookingType !== "dates" || !data.scheduledCheckOutAt || !data.scheduledCheckInAt) return true;
      return new Date(data.scheduledCheckOutAt) > new Date(data.scheduledCheckInAt);
    },
    {
      message: "Check-out date must be after check-in date",
      path: ["scheduledCheckOutAt"],
    },
  );
export type CheckInWalkInInput = z.infer<typeof checkInWalkInSchema>;

/**
 * Check-in for an existing reservation (spec §8/§9)
 */
export const checkInReservationSchema = z
  .object({
    bookingId: z.string().uuid("Invalid booking ID"),
    adultCount: z.coerce.number().int().min(1).max(10),
    childCount: z.coerce.number().int().min(0).max(10).default(0),
    adults: z.array(adultGuestSchema).min(1, "At least one adult is required"),
    children: z.array(childGuestSchema).default([]),
  })
  .refine((data) => data.adults.length === data.adultCount, {
    message: "Number of adult forms must match the adult count",
    path: ["adults"],
  })
  .refine((data) => data.children.length === data.childCount, {
    message: "Number of child forms must match the child count",
    path: ["children"],
  })
  .refine(
    (data) => data.adults.filter((a) => a.isPrimary).length === 1,
    {
      message: "Exactly one adult guest must be marked as the primary guest",
      path: ["adults"],
    },
  )
  .refine((data) => hasValidPrimaryGuest(data.adults), {
    message: "Primary guest needs a name, phone number, address, gender, and valid adult age",
    path: ["adults"],
  });
export type CheckInReservationInput = z.infer<typeof checkInReservationSchema>;
