import { createServerFn } from "@tanstack/react-start";
import { requireAdmin, requireAuth } from "./auth.middleware";
import { db } from "./db";
import { randomUUID } from "crypto";

export type AdminStats = {
  bookingsToday: number;
  openMenu: number;
  customers: number;
  ordersToday: number;
};

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AdminStats> => {
    const today = new Date().toISOString().slice(0, 10);
    
    const [b]: any = await db.execute("SELECT COUNT(*) as count FROM bookings WHERE booking_date = ?", [today]);
    const [m]: any = await db.execute("SELECT COUNT(*) as count FROM menu_items WHERE is_available = 1");
    const [c]: any = await db.execute("SELECT COUNT(*) as count FROM customers");
    const [o]: any = await db.execute("SELECT COUNT(*) as count FROM orders WHERE order_date = ?", [today]);

    return {
      bookingsToday: b[0]?.count ?? 0,
      openMenu: m[0]?.count ?? 0,
      customers: c[0]?.count ?? 0,
      ordersToday: o[0]?.count ?? 0,
    };
  });

export type AdminBookingRow = {
  id: string;
  booking_date: string;
  booking_time: string;
  party: number;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  mood: string | null;
  occasion: string | null;
  seating_preference: string | null;
  requests: string | null;
  status: string;
  reference_code: string | null;
  table_no: string | null;
  created_at: string;
};

export const getAdminBookings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AdminBookingRow[]> => {
    const [rows]: any = await db.execute(
      `SELECT b.*, t.table_no 
       FROM bookings b 
       LEFT JOIN restaurant_tables t ON b.table_id = t.id 
       ORDER BY b.booking_date DESC, b.booking_time DESC`
    );
    return (rows ?? []).map((b: any) => ({
      id: b.id,
      booking_date: b.booking_date,
      booking_time: b.booking_time,
      party: b.party,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      guest_email: b.guest_email,
      mood: b.mood,
      occasion: b.occasion,
      seating_preference: b.seating_preference,
      requests: b.requests,
      status: b.status,
      reference_code: b.reference_code,
      table_no: b.table_no,
      created_at: b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString(),
    }));
  });

export type AdminCustomerRow = {
  id: string;
  email: string;
  name: string;
  stamps: number;
  last_stamp_date: string | null;
  created_at: string;
};

export const getAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AdminCustomerRow[]> => {
    const [rows]: any = await db.execute("SELECT * FROM customers ORDER BY created_at DESC");
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      stamps: r.stamps,
      last_stamp_date: r.last_stamp_date ? new Date(r.last_stamp_date).toISOString().slice(0, 10) : null,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  });

export const createAdminCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: { name: string; email: string }) => data)
  .handler(async ({ data }) => {
    const id = randomUUID();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();

    // Check if customer already exists
    const [existing]: any = await db.execute("SELECT id FROM customers WHERE email = ?", [cleanEmail]);
    if (existing.length > 0) {
      throw new Error("A customer with this email already exists.");
    }

    await db.execute(
      "INSERT INTO customers (id, email, name, stamps, last_stamp_date) VALUES (?, ?, ?, 0, null)",
      [id, cleanEmail, cleanName]
    );

    return { success: true };
  });

export type AdminFeedbackRow = {
  id: string;
  user_id: string | null;
  rating: number;
  message: string | null;
  created_at: string;
};

export const getAdminFeedback = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AdminFeedbackRow[]> => {
    const [rows]: any = await db.execute("SELECT * FROM feedback ORDER BY created_at DESC");
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      rating: r.rating,
      message: r.message,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  });

export const getFeedbackForUser = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AdminFeedbackRow[]> => {
    const [rows]: any = await db.execute(
      "SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC",
      [context.userId]
    );
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      rating: r.rating,
      message: r.message,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  });

export const deleteChillNoteAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await db.execute("DELETE FROM chill_notes WHERE id = ?", [data.id]);
    return { success: true };
  });

export const deletePolaroidAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await db.execute("DELETE FROM memory_polaroids WHERE id = ?", [data.id]);
    return { success: true };
  });

export type AdminTable = {
  id: string;
  table_no: string;
  capacity: number;
  location: string;
  is_active: boolean;
  notes: string | null;
};

export const getAdminTables = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AdminTable[]> => {
    const [rows]: any = await db.execute("SELECT * FROM restaurant_tables ORDER BY table_no ASC");
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      table_no: r.table_no,
      capacity: r.capacity,
      location: r.location,
      is_active: Boolean(r.is_active),
      notes: r.notes,
    }));
  });

export const createAdminTable = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: { table_no: string; capacity: number; location: string; notes: string | null }) => data)
  .handler(async ({ data }) => {
    const tableId = randomUUID();
    await db.execute(
      `INSERT INTO restaurant_tables (id, table_no, capacity, location, notes, is_active) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [tableId, data.table_no, data.capacity, data.location, data.notes]
    );
    return { success: true };
  });

export const updateAdminTable = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: { id: string; patch: Partial<AdminTable> }) => data)
  .handler(async ({ data }) => {
    const sets: string[] = [];
    const params: any[] = [];
    
    if (data.patch.table_no !== undefined) {
      sets.push("table_no = ?");
      params.push(data.patch.table_no);
    }
    if (data.patch.capacity !== undefined) {
      sets.push("capacity = ?");
      params.push(data.patch.capacity);
    }
    if (data.patch.location !== undefined) {
      sets.push("location = ?");
      params.push(data.patch.location);
    }
    if (data.patch.is_active !== undefined) {
      sets.push("is_active = ?");
      params.push(data.patch.is_active ? 1 : 0);
    }
    if (data.patch.notes !== undefined) {
      sets.push("notes = ?");
      params.push(data.patch.notes);
    }

    if (sets.length === 0) return { success: true };

    params.push(data.id);
    await db.execute(
      `UPDATE restaurant_tables SET ${sets.join(", ")} WHERE id = ?`,
      params
    );
    return { success: true };
  });

export const deleteAdminTable = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await db.execute("DELETE FROM restaurant_tables WHERE id = ?", [data.id]);
    return { success: true };
  });

export const claimAdminIfNone = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const [admins]: any = await db.execute("SELECT * FROM user_roles WHERE role = 'admin'");
    if (admins.length > 0) {
      return { success: false, message: "Admin access has already been claimed." };
    }
    await db.execute(
      "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')",
      [randomUUID(), context.userId]
    );
    return { success: true };
  });
