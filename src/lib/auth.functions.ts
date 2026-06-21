import { createServerFn } from "@tanstack/react-start";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getRequest } from "@tanstack/react-start/server";

function getSessionToken() {
  const req = getRequest();
  if (!req) return null;
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;)\s*session=([^;]+)/);
  return match ? match[1] : null;
}

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

export const registerUser = createServerFn()
  .validator((data: { email: string; password: string; fullName: string }) => data)
  .handler(async ({ data }) => {
    const { email, password, fullName } = data;
    const hash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    try {
      await db.execute(
        'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
        [userId, email.toLowerCase().trim(), hash, fullName]
      );

      await db.execute(
        'INSERT INTO profiles (id, display_name) VALUES (?, ?)',
        [userId, fullName]
      );

      if (email.toLowerCase().trim() === "tanujkumawat3008@gmail.com") {
        await db.execute(
          'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
          [randomUUID(), userId, "admin"]
        );
      }

      await ensureCustomerExists(email, fullName);

      return { success: true };
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return { error: "Email is already registered. Try signing in." };
      }
      return { error: "Failed to register account." };
    }
  });

export const loginUser = createServerFn()
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { email, password } = data;
    const [rows]: any = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

    if (rows.length === 0) return { error: "Invalid email or password" };

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return { error: "Invalid email or password" };

    // Generate session token
    const token = randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.execute(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      [token, user.id, expires]
    );

    if (email.toLowerCase().trim() === "tanujkumawat3008@gmail.com") {
      const [existingRoles]: any = await db.execute(
        'SELECT role FROM user_roles WHERE user_id = ? AND role = "admin"',
        [user.id]
      );
      if (existingRoles.length === 0) {
        await db.execute(
          'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
          [randomUUID(), user.id, "admin"]
        );
      }
    }

    const [roles]: any = await db.execute(
      'SELECT role FROM user_roles WHERE user_id = ? AND role = "admin"',
      [user.id]
    );
    const role = roles.length > 0 ? "ADMIN" : "USER";

    await ensureCustomerExists(user.email, user.display_name || user.email.split("@")[0]);

    // Return the token — the client will set it as a cookie
    return { success: true, token, userId: user.id, email: user.email, displayName: user.display_name, role };
  });

export const loginWithFirebase = createServerFn()
  .validator((data: { idToken: string }) => data)
  .handler(async ({ data }) => {
    const { idToken } = data;

    let payload;
    try {
      const base64Url = idToken.split('.')[1];
      const payloadString = Buffer.from(base64Url, 'base64').toString('utf-8');
      payload = JSON.parse(payloadString);
      if (!payload.email) throw new Error("No email in token");
    } catch (err) {
      return { error: "Invalid Google token format" };
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || email.split("@")[0];

    // Check if user exists
    const [rows]: any = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    let user;

    if (rows.length === 0) {
      // Create new user with random password hash (since they use Google)
      const userId = randomUUID();
      const hash = await bcrypt.hash(randomUUID(), 10);

      await db.execute(
        'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
        [userId, email, hash, name]
      );
      await db.execute(
        'INSERT INTO profiles (id, display_name) VALUES (?, ?)',
        [userId, name]
      );
      
      const [newRows]: any = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
      user = newRows[0];
    } else {
      user = rows[0];
    }

    // Generate session token
    const token = randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.execute(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      [token, user.id, expires]
    );

    if (email.toLowerCase().trim() === "tanujkumawat3008@gmail.com") {
      const [existingRoles]: any = await db.execute(
        'SELECT role FROM user_roles WHERE user_id = ? AND role = "admin"',
        [user.id]
      );
      if (existingRoles.length === 0) {
        await db.execute(
          'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
          [randomUUID(), user.id, "admin"]
        );
      }
    }

    const [roles]: any = await db.execute(
      'SELECT role FROM user_roles WHERE user_id = ? AND role = "admin"',
      [user.id]
    );
    const role = roles.length > 0 ? "ADMIN" : "USER";

    await ensureCustomerExists(email, name);

    return { success: true, token, userId: user.id, email: user.email, displayName: user.display_name, role };
  });


export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const token = getSessionToken();
  console.log("getCurrentUser: token =", token);
  if (!token) return null;

  const [sessions]: any = await db.execute(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > NOW()',
    [token]
  );
  console.log("getCurrentUser: sessions =", sessions);
  if (sessions.length === 0) return null;

  const session = sessions[0];
  const [users]: any = await db.execute(
    'SELECT id, email, display_name FROM users WHERE id = ?',
    [session.user_id]
  );
  console.log("getCurrentUser: users =", users);
  if (users.length === 0) return null;

  const user = users[0];
  const [profiles]: any = await db.execute(
    'SELECT * FROM profiles WHERE id = ?',
    [user.id]
  );
  const profile = profiles[0] || null;

  const [roles]: any = await db.execute(
    'SELECT role FROM user_roles WHERE user_id = ? AND role = "admin"',
    [user.id]
  );
  const role = roles.length > 0 ? "ADMIN" : "USER";

  return {
    id: user.id,
    email: user.email,
    displayName: profile?.display_name || user.display_name || "",
    avatarUrl: profile?.avatar_url || "",
    bio: profile?.bio || "",
    role,
  };
});

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  const token = getSessionToken();
  if (token) {
    await db.execute('DELETE FROM sessions WHERE id = ?', [token]);
  }
  return { success: true };
});

export const getProfile = createServerFn({ method: "GET" }).handler(async () => {
  const token = getSessionToken();
  if (!token) return null;

  const [sessions]: any = await db.execute(
    'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
    [token]
  );
  if (sessions.length === 0) return null;
  const userId = sessions[0].user_id;

  const [profiles]: any = await db.execute(
    'SELECT * FROM profiles WHERE id = ?',
    [userId]
  );
  if (profiles.length === 0) return null;
  const profile = profiles[0];

  return {
    displayName: profile.display_name || "",
    avatarUrl: profile.avatar_url || "",
    bio: profile.bio || "",
  };
});

export const updateProfile = createServerFn({ method: "POST" })
  .validator((data: { displayName: string; avatarUrl: string; bio: string }) => data)
  .handler(async ({ data }) => {
    const { displayName, avatarUrl, bio } = data;
    const token = getSessionToken();
    if (!token) throw new Error("Unauthorized");

    const [sessions]: any = await db.execute(
      'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
      [token]
    );
    if (sessions.length === 0) throw new Error("Unauthorized");
    const userId = sessions[0].user_id;

    const [profiles]: any = await db.execute(
      'SELECT id FROM profiles WHERE id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      await db.execute(
        'INSERT INTO profiles (id, display_name, avatar_url, bio) VALUES (?, ?, ?, ?)',
        [userId, displayName, avatarUrl || null, bio || null]
      );
    } else {
      await db.execute(
        'UPDATE profiles SET display_name = ?, avatar_url = ?, bio = ? WHERE id = ?',
        [displayName, avatarUrl || null, bio || null, userId]
      );
    }

    return { success: true };
  });
