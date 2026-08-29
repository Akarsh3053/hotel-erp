CREATE TYPE "public"."booking_type" AS ENUM('hourly', 'nightly', 'dates');--> statement-breakpoint
CREATE TYPE "public"."pricing_type" AS ENUM('fixed', 'flexi');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"receipt_url" text,
	"receipt_public_id" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "booking_type" "booking_type" DEFAULT 'nightly' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "total_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "pricing_type" "pricing_type" DEFAULT 'fixed' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_property_idx" ON "expenses" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "expenses_created_by_idx" ON "expenses" USING btree ("created_by");