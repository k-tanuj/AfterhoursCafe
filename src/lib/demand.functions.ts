import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./auth.middleware";
import { db } from "./db";
import type { BookingRecord, ForecastRow } from "./demand.types";
import { randomUUID } from "crypto";

export const getLatestForecast = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ForecastRow | null> => {
    const [rows]: any = await db.execute(
      `SELECT id, trained_at, training_window_start, training_window_end, sample_size, mae, predictions, notes 
       FROM demand_forecasts 
       ORDER BY trained_at DESC 
       LIMIT 1`
    );
    if (!rows || rows.length === 0) return null;
    const row = rows[0];

    // parse predictions if it comes back as a string from mysql
    let preds = row.predictions;
    if (typeof preds === "string") {
      try {
        preds = JSON.parse(preds);
      } catch (e) {
        // Fallback
      }
    }

    return {
      id: row.id,
      trained_at: row.trained_at ? new Date(row.trained_at).toISOString() : new Date().toISOString(),
      training_window_start: row.training_window_start,
      training_window_end: row.training_window_end,
      sample_size: row.sample_size,
      mae: row.mae != null ? Number(row.mae) : null,
      predictions: preds,
      notes: row.notes,
    };
  });

export const retrainDemand = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ForecastRow> => {
    const { trainAndPredict } = await import("./demand.server");

    // Fetch all bookings from MySQL (excluding cancelled/no_show)
    const [bookings]: any = await db.execute(
      `SELECT booking_date, booking_time, party, mood, created_at 
       FROM bookings 
       WHERE status NOT IN ('cancelled', 'no_show')
       ORDER BY created_at DESC 
       LIMIT 5000`
    );

    // Map rows to correct types
    const formattedBookings = (bookings ?? []).map((b: any) => ({
      booking_date: b.booking_date,
      booking_time: b.booking_time,
      party: Number(b.party),
      mood: b.mood,
      created_at: b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString(),
    }));

    let result;

    try {
      const res = await fetch("http://127.0.0.1:8000/retrain", { 
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to reach Python API");
      
      const pyResult = await res.json();
      if (pyResult.error) throw new Error(pyResult.error);
      
      result = pyResult;
    } catch (e) {
      console.warn("Python API failed. Using Node heuristic fallback.", e);
      result = await trainAndPredict(formattedBookings as BookingRecord[]);
    }

    const id = randomUUID();
    const trained_at = new Date().toISOString();
    
    await db.execute(
      `INSERT INTO demand_forecasts (
        id, trained_at, training_window_start, training_window_end, sample_size, mae, predictions, notes
      ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`,
      [
        id,
        result.training_window_start,
        result.training_window_end,
        result.sample_size,
        result.mae,
        JSON.stringify(result.predictions),
        result.notes,
      ]
    );

    return {
      id,
      trained_at,
      training_window_start: result.training_window_start,
      training_window_end: result.training_window_end,
      sample_size: result.sample_size,
      mae: result.mae,
      predictions: result.predictions as any,
      notes: result.notes,
    };
  });

import bcrypt from "bcryptjs";

async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const [rows]: any = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (rows.length === 0) return false;

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return false;

  const [roles]: any = await db.execute(
    "SELECT role FROM user_roles WHERE user_id = ? AND role = 'admin'",
    [user.id]
  );
  return roles.length > 0;
}

export const secureRetrainDemand = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }): Promise<ForecastRow> => {
    const { email, password } = data;

    // 1. Verify Credentials explicitly
    const isValid = await verifyAdminCredentials(email, password);
    if (!isValid) {
      throw new Error("Invalid admin credentials");
    }

    const { trainAndPredict } = await import("./demand.server");

    // Fetch all bookings from MySQL (excluding cancelled/no_show)
    const [bookings]: any = await db.execute(
      `SELECT booking_date, booking_time, party, mood, created_at 
       FROM bookings 
       WHERE status NOT IN ('cancelled', 'no_show')
       ORDER BY created_at DESC 
       LIMIT 5000`
    );

    // Map rows to correct types
    const formattedBookings = (bookings ?? []).map((b: any) => ({
      booking_date: b.booking_date,
      booking_time: b.booking_time,
      party: Number(b.party),
      mood: b.mood,
      created_at: b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString(),
    }));

    let result;

    try {
      const res = await fetch("http://127.0.0.1:8000/retrain", { 
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to reach Python API");
      
      const pyResult = await res.json();
      if (pyResult.error) throw new Error(pyResult.error);
      
      result = pyResult;
    } catch (e) {
      console.warn("Python API failed. Using Node heuristic fallback.", e);
      result = await trainAndPredict(formattedBookings as BookingRecord[]);
    }

    const id = randomUUID();
    const trained_at = new Date().toISOString();
    
    await db.execute(
      `INSERT INTO demand_forecasts (
        id, trained_at, training_window_start, training_window_end, sample_size, mae, predictions, notes
      ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`,
      [
        id,
        result.training_window_start,
        result.training_window_end,
        result.sample_size,
        result.mae,
        JSON.stringify(result.predictions),
        result.notes,
      ]
    );

    return {
      id,
      trained_at,
      training_window_start: result.training_window_start,
      training_window_end: result.training_window_end,
      sample_size: result.sample_size,
      mae: result.mae,
      predictions: result.predictions as any,
      notes: result.notes,
    };
  });
