import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
