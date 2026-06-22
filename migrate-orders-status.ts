import { db } from "./src/lib/db";

async function run() {
  try {
    console.log("Running migration: Add status to orders table...");
    await db.execute(`
      ALTER TABLE orders 
      ADD COLUMN status ENUM('placed', 'preparing', 'completed') NOT NULL DEFAULT 'completed'
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
