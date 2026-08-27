import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Neon HTTP + Drizzle client.
 *
 * The connection string comes from `DATABASE_URL` (see `.env.example`). A
 * syntactically-valid placeholder is used as a fallback so that importing this
 * module never throws during `next build` before the real key is configured —
 * actual queries still require a real `DATABASE_URL` and will fail loudly
 * without one (see `/api/health`).
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== "production") {
  console.warn(
    "[db] DATABASE_URL is not set — database queries will fail until it is configured in .env.local",
  );
}

const sql = neon(
  connectionString ?? "postgresql://placeholder:placeholder@localhost:5432/db",
);

export const db = drizzle(sql, { schema });

export { schema };
