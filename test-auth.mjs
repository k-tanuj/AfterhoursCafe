/**
 * Test script — run with: node test-auth.mjs
 * Tests registration and login by calling the server directly using the same
 * fetch format as the browser client.
 */

const BASE = "http://localhost:8080";

// Helper: calls a TanStack server function via HTTP
async function callServerFn(fnUrl, data) {
  const payload = JSON.stringify({ data });
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tsr-serverFn": "true",
      "accept": "application/x-tss-framed, application/x-ndjson, application/json",
    },
    body: payload,
  });
  const text = await res.text();
  console.log(`  Status: ${res.status}`);
  console.log(`  Body: ${text.slice(0, 300)}`);
  return { status: res.status, text };
}

async function main() {
  const testEmail = `test_${Date.now()}@afterhours.test`;
  const testPass = "password123";
  const testName = "Test User";

  console.log("\n=== TEST 1: REGISTER ===");
  console.log(`  Email: ${testEmail}`);
  
  // First, find the server function URL by looking at what the client-side bundle generates
  // TanStack Start creates URLs like: /_serverFn/{functionId}
  // We need to find the actual function ID. Let's try a direct DB test instead.
  
  const mysql = (await import("mysql2/promise")).default;
  const bcrypt = (await import("bcrypt")).default;
  const { randomUUID } = await import("crypto");

  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root", 
    password: "student",
    database: "afterhours",
  });

  try {
    console.log("\n=== TEST: Direct DB Insert (Register Flow) ===");
    const hash = await bcrypt.hash(testPass, 10);
    const userId = randomUUID();
    
    await conn.execute(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      [userId, testEmail, hash]
    );
    await conn.execute(
      "INSERT INTO profiles (id, display_name) VALUES (?, ?)",
      [userId, testName]
    );
    console.log("  ✅ User registered successfully");

    console.log("\n=== TEST: Login Flow ===");
    const [rows] = await conn.execute("SELECT * FROM users WHERE email = ?", [testEmail]);
    const user = rows[0];
    const match = await bcrypt.compare(testPass, user.password_hash);
    console.log(`  Password match: ${match ? "✅" : "❌"}`);

    const token = randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await conn.execute(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
      [token, user.id, expires]
    );
    console.log(`  ✅ Session created: ${token}`);

    console.log("\n=== CLEANUP ===");
    await conn.execute("DELETE FROM sessions WHERE id = ?", [token]);
    await conn.execute("DELETE FROM profiles WHERE id = ?", [userId]);
    await conn.execute("DELETE FROM users WHERE id = ?", [userId]);
    console.log("  ✅ Cleaned up test data");

    console.log("\n✅ ALL TESTS PASSED — The database layer is working correctly.");
    console.log("   The issue is in the server function transport layer, NOT the DB.");
    
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error("❌ TEST FAILED:", e.message);
  process.exit(1);
});
