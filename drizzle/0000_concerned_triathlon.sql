CREATE TYPE "public"."booking_status" AS ENUM('reserved', 'checked_in', 'checked_out', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."guest_type" AS ENUM('adult', 'child');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'manager', 'receptionist', 'cleaner');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('available', 'reserved', 'occupied', 'housekeeping');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('assigned', 'in_progress', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'reserved' NOT NULL,
	"scheduled_check_in_at" timestamp with time zone,
	"scheduled_check_out_at" timestamp with time zone,
	"actual_check_in_at" timestamp with time zone,
	"actual_check_out_at" timestamp with time zone,
	"adult_count" integer DEFAULT 1 NOT NULL,
	"child_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_for_room_type_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"guest_type" "guest_type" NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"gender" "gender",
	"age" integer,
	"contact" text,
	"id_photo_front_url" text,
	"id_photo_back_url" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housekeeping_task_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"template_item_id" uuid,
	"label" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "housekeeping_task_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housekeeping_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"booking_id" uuid,
	"checklist_template_id" uuid,
	"assigned_cleaner_id" uuid,
	"assigned_by" uuid,
	"status" "task_status" DEFAULT 'assigned' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" text,
	"owner_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"photo_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"total_rooms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
CREATE TABLE "property_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_members_property_user_uq" UNIQUE("property_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_price" numeric(10, 2),
	"max_occupancy" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_type_id" uuid NOT NULL,
	"room_number" text NOT NULL,
	"floor" text,
	"status" "room_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_property_number_uq" UNIQUE("property_id","room_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_default_for_room_type_id_room_types_id_fk" FOREIGN KEY ("default_for_room_type_id") REFERENCES "public"."room_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_task_items" ADD CONSTRAINT "housekeeping_task_items_task_id_housekeeping_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."housekeeping_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_task_items" ADD CONSTRAINT "housekeeping_task_items_template_item_id_checklist_template_items_id_fk" FOREIGN KEY ("template_item_id") REFERENCES "public"."checklist_template_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_task_photos" ADD CONSTRAINT "housekeeping_task_photos_task_id_housekeeping_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."housekeeping_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_checklist_template_id_checklist_templates_id_fk" FOREIGN KEY ("checklist_template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_assigned_cleaner_id_users_id_fk" FOREIGN KEY ("assigned_cleaner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_members" ADD CONSTRAINT "property_members_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_members" ADD CONSTRAINT "property_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_members" ADD CONSTRAINT "property_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_property_idx" ON "bookings" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "bookings_room_idx" ON "bookings" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("property_id","status");--> statement-breakpoint
CREATE INDEX "checklist_template_items_template_idx" ON "checklist_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "checklist_templates_property_idx" ON "checklist_templates" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "guests_booking_idx" ON "guests" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "housekeeping_task_items_task_idx" ON "housekeeping_task_items" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "housekeeping_task_photos_task_idx" ON "housekeeping_task_photos" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "housekeeping_tasks_property_idx" ON "housekeeping_tasks" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "housekeeping_tasks_room_idx" ON "housekeeping_tasks" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "housekeeping_tasks_cleaner_idx" ON "housekeeping_tasks" USING btree ("assigned_cleaner_id","status");--> statement-breakpoint
CREATE INDEX "housekeeping_tasks_status_idx" ON "housekeeping_tasks" USING btree ("property_id","status");--> statement-breakpoint
CREATE INDEX "property_members_user_idx" ON "property_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "property_members_property_idx" ON "property_members" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "room_types_property_idx" ON "room_types" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "rooms_property_idx" ON "rooms" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "rooms_status_idx" ON "rooms" USING btree ("property_id","status");