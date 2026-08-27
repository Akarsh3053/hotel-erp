import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so load env from .env.local explicitly.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
