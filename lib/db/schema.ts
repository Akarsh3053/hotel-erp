import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/* ---------------------------------------------------------------------------
 * Enums  (spec §5 / §6)
 * ------------------------------------------------------------------------- */
export const roleEnum = pgEnum("role", [
  "owner",
  "manager",
  "receptionist",
  "cleaner",
]);
export const roomStatusEnum = pgEnum("room_status", [
  "available",
  "reserved",
  "occupied",
  "housekeeping",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "reserved",
  "checked_in",
  "checked_out",
  "cancelled",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "assigned",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
]);
export const guestTypeEnum = pgEnum("guest_type", ["adult", "child"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const pricingTypeEnum = pgEnum("pricing_type", ["fixed", "flexi"]);
export const bookingTypeEnum = pgEnum("booking_type", ["hourly", "nightly", "dates"]);

/* Shared timestamp columns. */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

/* ---------------------------------------------------------------------------
 * users — local mirror of Clerk users, synced via webhook (spec §5)
 * ------------------------------------------------------------------------- */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  ...timestamps,
});

/* ---------------------------------------------------------------------------
 * properties — one Clerk Organization per property (spec §4/§5)
 * ------------------------------------------------------------------------- */
export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkOrgId: text("clerk_org_id").unique(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  address: text("address"),
  photoUrls: text("photo_urls")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  totalRooms: integer("total_rooms"),
  ...timestamps,
});

/* ---------------------------------------------------------------------------
 * property_members — the authoritative app-role mapping (spec §3/§4)
 * ------------------------------------------------------------------------- */
export const propertyMembers = pgTable(
  "property_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    invitedBy: uuid("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    unique("property_members_property_user_uq").on(t.propertyId, t.userId),
    index("property_members_user_idx").on(t.userId),
    index("property_members_property_idx").on(t.propertyId),
  ],
);

/* ---------------------------------------------------------------------------
 * room_types (spec §5)
 * ------------------------------------------------------------------------- */
export const roomTypes = pgTable(
  "room_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    pricingType: pricingTypeEnum("pricing_type").notNull().default("fixed"),
    displayPrice: numeric("display_price", { precision: 10, scale: 2 }),
    maxOccupancy: integer("max_occupancy"),
    ...timestamps,
  },
  (t) => [index("room_types_property_idx").on(t.propertyId)],
);

/* ---------------------------------------------------------------------------
 * rooms (spec §5/§6)
 * ------------------------------------------------------------------------- */
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomTypeId: uuid("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "restrict" }),
    roomNumber: text("room_number").notNull(),
    floor: text("floor"),
    status: roomStatusEnum("status").notNull().default("available"),
    ...timestamps,
  },
  (t) => [
    unique("rooms_property_number_uq").on(t.propertyId, t.roomNumber),
    index("rooms_property_idx").on(t.propertyId),
    index("rooms_status_idx").on(t.propertyId, t.status),
  ],
);

/* ---------------------------------------------------------------------------
 * checklist_templates + items (spec §5)
 * ------------------------------------------------------------------------- */
export const checklistTemplates = pgTable(
  "checklist_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    defaultForRoomTypeId: uuid("default_for_room_type_id").references(
      () => roomTypes.id,
      { onDelete: "set null" },
    ),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [index("checklist_templates_property_idx").on(t.propertyId)],
);

export const checklistTemplateItems = pgTable(
  "checklist_template_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => checklistTemplates.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("checklist_template_items_template_idx").on(t.templateId)],
);

/* ---------------------------------------------------------------------------
 * bookings (spec §5/§6)
 * ------------------------------------------------------------------------- */
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    status: bookingStatusEnum("status").notNull().default("reserved"),
    bookingType: bookingTypeEnum("booking_type").notNull().default("nightly"),
    totalPrice: numeric("total_price", { precision: 10, scale: 2 }),
    scheduledCheckInAt: timestamp("scheduled_check_in_at", {
      withTimezone: true,
    }),
    scheduledCheckOutAt: timestamp("scheduled_check_out_at", {
      withTimezone: true,
    }),
    actualCheckInAt: timestamp("actual_check_in_at", { withTimezone: true }),
    actualCheckOutAt: timestamp("actual_check_out_at", { withTimezone: true }),
    adultCount: integer("adult_count").notNull().default(1),
    childCount: integer("child_count").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("bookings_property_idx").on(t.propertyId),
    index("bookings_room_idx").on(t.roomId),
    index("bookings_status_idx").on(t.propertyId, t.status),
  ],
);

/* ---------------------------------------------------------------------------
 * guests — captured at check-in; ID photos are PII (spec §5/§8/§10)
 * ------------------------------------------------------------------------- */
export const guests = pgTable(
  "guests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    guestType: guestTypeEnum("guest_type").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    gender: genderEnum("gender"),
    age: integer("age"),
    contact: text("contact"),
    idPhotoFrontUrl: text("id_photo_front_url"),
    idPhotoBackUrl: text("id_photo_back_url"),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("guests_booking_idx").on(t.bookingId)],
);

/* ---------------------------------------------------------------------------
 * housekeeping_tasks (+ items, photos) (spec §5/§6/§7)
 * `property_id` is denormalized here so the cleaner's "assigned to me" queue
 * and the manager's review queue stay strictly tenant-scoped (spec §10).
 * ------------------------------------------------------------------------- */
export const housekeepingTasks = pgTable(
  "housekeeping_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    checklistTemplateId: uuid("checklist_template_id").references(
      () => checklistTemplates.id,
      { onDelete: "set null" },
    ),
    assignedCleanerId: uuid("assigned_cleaner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: taskStatusEnum("status").notNull().default("assigned"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewNotes: text("review_notes"),
    ...timestamps,
  },
  (t) => [
    index("housekeeping_tasks_property_idx").on(t.propertyId),
    index("housekeeping_tasks_room_idx").on(t.roomId),
    index("housekeeping_tasks_cleaner_idx").on(t.assignedCleanerId, t.status),
    index("housekeeping_tasks_status_idx").on(t.propertyId, t.status),
  ],
);

export const housekeepingTaskItems = pgTable(
  "housekeeping_task_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => housekeepingTasks.id, { onDelete: "cascade" }),
    templateItemId: uuid("template_item_id").references(
      () => checklistTemplateItems.id,
      { onDelete: "set null" },
    ),
    label: text("label").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("housekeeping_task_items_task_idx").on(t.taskId)],
);

export const housekeepingTaskPhotos = pgTable(
  "housekeeping_task_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => housekeepingTasks.id, { onDelete: "cascade" }),
    photoUrl: text("photo_url").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("housekeeping_task_photos_task_idx").on(t.taskId)],
);

/* ---------------------------------------------------------------------------
 * expenses
 * ------------------------------------------------------------------------- */
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    receiptUrl: text("receipt_url"),
    receiptPublicId: text("receipt_public_id"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("expenses_property_idx").on(t.propertyId),
    index("expenses_created_by_idx").on(t.createdBy),
  ],
);

/* ---------------------------------------------------------------------------
 * Relations (ergonomics for later query phases)
 * ------------------------------------------------------------------------- */
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(propertyMembers),
  expenses: many(expenses),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerUserId],
    references: [users.id],
  }),
  members: many(propertyMembers),
  roomTypes: many(roomTypes),
  rooms: many(rooms),
  checklistTemplates: many(checklistTemplates),
  bookings: many(bookings),
  expenses: many(expenses),
}));

export const propertyMembersRelations = relations(
  propertyMembers,
  ({ one }) => ({
    property: one(properties, {
      fields: [propertyMembers.propertyId],
      references: [properties.id],
    }),
    user: one(users, {
      fields: [propertyMembers.userId],
      references: [users.id],
    }),
  }),
);

export const roomTypesRelations = relations(roomTypes, ({ one, many }) => ({
  property: one(properties, {
    fields: [roomTypes.propertyId],
    references: [properties.id],
  }),
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  property: one(properties, {
    fields: [rooms.propertyId],
    references: [properties.id],
  }),
  roomType: one(roomTypes, {
    fields: [rooms.roomTypeId],
    references: [roomTypes.id],
  }),
  bookings: many(bookings),
  housekeepingTasks: many(housekeepingTasks),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  property: one(properties, {
    fields: [bookings.propertyId],
    references: [properties.id],
  }),
  room: one(rooms, { fields: [bookings.roomId], references: [rooms.id] }),
  guests: many(guests),
}));

export const guestsRelations = relations(guests, ({ one }) => ({
  booking: one(bookings, {
    fields: [guests.bookingId],
    references: [bookings.id],
  }),
}));

export const checklistTemplatesRelations = relations(
  checklistTemplates,
  ({ one, many }) => ({
    property: one(properties, {
      fields: [checklistTemplates.propertyId],
      references: [properties.id],
    }),
    items: many(checklistTemplateItems),
  }),
);

export const checklistTemplateItemsRelations = relations(
  checklistTemplateItems,
  ({ one }) => ({
    template: one(checklistTemplates, {
      fields: [checklistTemplateItems.templateId],
      references: [checklistTemplates.id],
    }),
  }),
);

export const housekeepingTasksRelations = relations(
  housekeepingTasks,
  ({ one, many }) => ({
    property: one(properties, {
      fields: [housekeepingTasks.propertyId],
      references: [properties.id],
    }),
    room: one(rooms, {
      fields: [housekeepingTasks.roomId],
      references: [rooms.id],
    }),
    template: one(checklistTemplates, {
      fields: [housekeepingTasks.checklistTemplateId],
      references: [checklistTemplates.id],
    }),
    items: many(housekeepingTaskItems),
    photos: many(housekeepingTaskPhotos),
  }),
);

export const housekeepingTaskItemsRelations = relations(
  housekeepingTaskItems,
  ({ one }) => ({
    task: one(housekeepingTasks, {
      fields: [housekeepingTaskItems.taskId],
      references: [housekeepingTasks.id],
    }),
  }),
);

export const housekeepingTaskPhotosRelations = relations(
  housekeepingTaskPhotos,
  ({ one }) => ({
    task: one(housekeepingTasks, {
      fields: [housekeepingTaskPhotos.taskId],
      references: [housekeepingTasks.id],
    }),
  }),
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  property: one(properties, {
    fields: [expenses.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
}));
