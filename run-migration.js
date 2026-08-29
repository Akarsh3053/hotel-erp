import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function main() {
  console.log("Running migration...");
  
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "expenses" (
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
    `);
    
    await db.execute(`
      DO $$ BEGIN
       ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(`
      DO $$ BEGIN
       ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute('CREATE INDEX IF NOT EXISTS "expenses_property_idx" ON "expenses" USING btree ("property_id");');
    await db.execute('CREATE INDEX IF NOT EXISTS "expenses_created_by_idx" ON "expenses" USING btree ("created_by");');

    try {
      await db.execute('ALTER TABLE "property_members" ADD CONSTRAINT "property_members_property_user_uq" UNIQUE("property_id","user_id");');
    } catch (e) {
      console.log("Constraint might already exist, ignoring error:", e.message);
    }
    
    console.log("Success!");
  } catch (error) {
    console.error("Failed:", error);
  }
}

main();
