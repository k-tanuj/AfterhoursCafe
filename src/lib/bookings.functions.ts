import { createServerFn } from "@tanstack/react-start";
import { requireAuth, requireAdmin } from "./auth.middleware";
import { z } from "zod";
import { db } from "./db";
import { randomUUID } from "crypto";
import { sendBookingConfirmationEmail } from "./email.server";

const createSchema = z.object({
  booking_date: z.string().min(1),
  booking_time: z.string().min(1),
  party: z.number().int().min(1).max(20),
  guest_name: z.string().trim().min(2).max(80),
  guest_phone: z.string().trim().min(7).max(20),
  guest_email: z.string().trim().email().max(200),
  mood: z.string().max(40).optional().nullable(),
  occasion: z.string().max(40).optional().nullable(),
  seating_preference: z.string().max(40).optional().nullable(),
  requests: z.string().max(500).optional().nullable(),
  table_id: z.string().uuid().optional().nullable(),
});

function refCode() {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "AH-";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export type CreateBookingResult = {
  id: string;
  reference_code: string;
  table_no: string;
  table_capacity: number;
  booking_date: string;
  booking_time: string;
};

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }): Promise<CreateBookingResult> => {
    // Pull active tables that fit, smallest-first to maximize utilization
    const [tables]: any = await db.execute(
      "SELECT id, table_no, capacity FROM restaurant_tables WHERE is_active = 1 AND capacity >= ? ORDER BY capacity ASC",
      [data.party]
    );
    if (!tables || tables.length === 0) {
      throw new Error(`No table available for a party of ${data.party}.`);
    }

    // Find tables already booked in that exact slot (not cancelled)
    const [taken]: any = await db.execute(
      "SELECT table_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status NOT IN ('cancelled', 'no_show')",
      [data.booking_date, data.booking_time]
    );

    const busy = new Set((taken ?? []).map((r: any) => r.table_id).filter(Boolean));
    let pick: any = null;
    
    if (data.table_id) {
      if (busy.has(data.table_id)) throw new Error("That table was just booked by someone else. Try another one.");
      pick = tables.find((t: any) => t.id === data.table_id);
      if (!pick) throw new Error("Selected table is invalid or does not fit your party.");
    } else {
      pick = tables.find((t: any) => !busy.has(t.id));
      if (!pick) throw new Error("That slot is full. Try another time.");
    }

    let attempt = 0;
    while (attempt < 4) {
      const code = refCode();
      const bookingId = randomUUID();
      try {
        await db.execute(
          `INSERT INTO bookings (
            id, user_id, booking_date, booking_time, party,
            guest_name, guest_phone, guest_email, mood,
            occasion, seating_preference, requests, status,
            table_id, reference_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
          [
            bookingId,
            context.userId,
            data.booking_date,
            data.booking_time,
            data.party,
            data.guest_name,
            data.guest_phone,
            data.guest_email,
            data.mood ?? null,
            data.occasion ?? null,
            data.seating_preference ?? null,
            data.requests ?? null,
            pick.id,
            code,
          ]
        );

        // Send the confirmation email asynchronously (do not await so it doesn't block the UI)
        sendBookingConfirmationEmail({
          guest_email: data.guest_email,
          guest_name: data.guest_name,
          reference_code: code,
          booking_date: data.booking_date,
          booking_time: data.booking_time,
          party: data.party,
          table_no: pick.table_no,
        }).catch(err => console.error("Email error:", err));

        return {
          id: bookingId,
          reference_code: code,
          table_no: pick.table_no,
          table_capacity: pick.capacity,
          booking_date: data.booking_date,
          booking_time: data.booking_time,
        };
      } catch (err: any) {
        if (err.code === "ER_DUP_ENTRY" && err.message.includes("reference_code")) {
          attempt++;
          continue;
        }
        throw err;
      }
    }
    throw new Error("Could not generate booking reference. Try again.");
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await db.execute(
      "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ?",
      [data.id, context.userId]
    );
    return { ok: true };
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "confirmed", "seated", "cancelled", "no_show"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await db.execute(
      "UPDATE bookings SET status = ? WHERE id = ?",
      [data.status, data.id]
    );
    return { ok: true };
  });

export type MyBookingRow = {
  id: string;
  booking_date: string;
  booking_time: string;
  party: number;
  status: string;
  mood: string | null;
  occasion: string | null;
  seating_preference: string | null;
  requests: string | null;
  reference_code: string | null;
  table_no: string | null;
  created_at: string;
};

export const getMyBookings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<MyBookingRow[]> => {
    const [rows]: any = await db.execute(
      `SELECT b.*, t.table_no 
       FROM bookings b 
       LEFT JOIN restaurant_tables t ON b.table_id = t.id 
       WHERE b.user_id = ? 
       ORDER BY b.created_at DESC 
       LIMIT 50`,
      [context.userId]
    );
    return (rows ?? []).map((b: any) => ({
      id: b.id,
      booking_date: b.booking_date,
      booking_time: b.booking_time,
      party: b.party,
      status: b.status,
      mood: b.mood,
      occasion: b.occasion,
      seating_preference: b.seating_preference,
      requests: b.requests,
      reference_code: b.reference_code,
      table_no: b.table_no,
      created_at: b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString(),
    }));
  });

const availSchema = z.object({
  booking_date: z.string().min(1),
  party: z.number().int().min(1).max(20),
});

export type AvailableTable = {
  id: string;
  table_no: string;
  capacity: number;
  location: string;
};

export type Availability = {
  slots: Record<string, AvailableTable[]>;
  all_fitting_tables: AvailableTable[];
  any_fitting_tables: boolean;
};

export const getAvailability = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => availSchema.parse(d))
  .handler(async ({ data }): Promise<Availability> => {
    const [tables]: any = await db.execute(
      "SELECT id, table_no, capacity, location FROM restaurant_tables WHERE is_active = 1 AND capacity >= ? ORDER BY capacity ASC",
      [data.party]
    );
    const allFitting = (tables ?? []) as AvailableTable[];
    const fittingIds = new Set(allFitting.map((t) => t.id));
    
    if (fittingIds.size === 0) {
      return { slots: {}, all_fitting_tables: [], any_fitting_tables: false };
    }

    const [booked]: any = await db.execute(
      "SELECT booking_time, table_id FROM bookings WHERE booking_date = ? AND status NOT IN ('cancelled', 'no_show')",
      [data.booking_date]
    );

    const takenPerSlot = new Map<string, Set<string>>();
    for (const row of booked ?? []) {
      if (!row.table_id || !fittingIds.has(row.table_id)) continue;
      const s = takenPerSlot.get(row.booking_time) ?? new Set();
      s.add(row.table_id);
      takenPerSlot.set(row.booking_time, s);
    }
    
    const slots: Record<string, AvailableTable[]> = {};
    for (const [time, busySet] of takenPerSlot.entries()) {
      slots[time] = allFitting.filter(t => !busySet.has(t.id));
    }
    
    return { slots, all_fitting_tables: allFitting, any_fitting_tables: true };
  });