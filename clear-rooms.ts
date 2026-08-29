import { db } from "./lib/db/index.ts";
import { rooms } from "./lib/db/schema.ts";

async function main() {
  console.log("Emptying rooms...");
  await db.delete(rooms);
  console.log("Done.");
}

main().catch(console.error);
