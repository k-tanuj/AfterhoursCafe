/**
 * Plain REST API handlers for auth routes.
 * These are registered in server.ts BEFORE TanStack Start processes requests.
 * They accept plain JSON and return plain JSON — directly testable in Postman.
 *
 * POST /api/auth/register  { email, password, fullName }
 * POST /api/auth/login     { email, password }
 */

import { db } from "./db";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

async function ensureCustomerExists(email: string, name: string) {
  const cleanEmail = email.toLowerCase().trim();
  const [rows]: any = await db.execute('SELECT id FROM customers WHERE email = ?', [cleanEmail]);
  if (rows.length === 0) {
    await db.execute(
      'INSERT INTO customers (id, email, name, stamps, last_stamp_date) VALUES (?, ?, ?, 0, null)',
      [randomUUID(), cleanEmail, name]
    );
  }
}

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export async function handleAuthRegister(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { email, password, fullName } = body as {
      email?: string;
      password?: string;
      fullName?: string;
    };

    if (!email || !password || !fullName) {
      return json({ error: "email, password, and fullName are required" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "password must be at least 6 characters" }, 400);
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    await db.execute(
      "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)",
      [userId, email.toLowerCase().trim(), hash, fullName.trim()]
    );
    await db.execute(
      "INSERT INTO profiles (id, display_name) VALUES (?, ?)",
      [userId, fullName.trim()]
    );

    await ensureCustomerExists(email, fullName);

    return json({ success: true, message: "Account created successfully" }, 201);
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      return json({ error: "Email already registered" }, 409);
    }
    console.error("[auth/register]", error);
    return json({ error: "Registration failed: " + error.message }, 500);
  }
}

export async function handleAuthLogin(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return json({ error: "email and password are required" }, 400);
    }

    const [rows]: any = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return json({ error: "Invalid email or password" }, 401);
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return json({ error: "Invalid email or password" }, 401);
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.execute(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
      [token, user.id, expires]
    );

    await ensureCustomerExists(user.email, user.display_name || user.email.split("@")[0]);

    const cookieMaxAge = 7 * 24 * 60 * 60;
    return json(
      { success: true, token, userId: user.id },
      200,
      {
        "Set-Cookie": `session=${token}; Path=/; HttpOnly; Max-Age=${cookieMaxAge}; SameSite=Lax`,
      }
    );
  } catch (error: any) {
    console.error("[auth/login]", error);
    return json({ error: "Login failed: " + error.message }, 500);
  }
}
