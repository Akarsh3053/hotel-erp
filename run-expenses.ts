import { db } from './lib/db/index.ts';
import { sql } from 'drizzle-orm';

const queries = [
  `CREATE TABLE IF NOT EXISTS "expenses"( "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "property_id" uuid NOT NULL, "title" text NOT NULL, "amount" numeric(10, 2) NOT NULL, "receipt_url" text, "receipt_public_id" text, "created_by" uuid, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL )`,
  `ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_property_id_properties_id_fk"`,
  `ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_created_by_users_id_fk"`,
  `ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action`,
  `CREATE INDEX IF NOT EXISTS "expenses_property_idx" ON "expenses" USING btree ("property_id")`,
  `CREATE INDEX IF NOT EXISTS "expenses_created_by_idx" ON "expenses" USING btree ("created_by")`
];

async function main() {
  for (const q of queries) {
    console.log(q);
    await db.execute(sql.raw(q));
  }
  console.log('success');
}

main().catch(console.error);
