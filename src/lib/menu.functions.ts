import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./auth.middleware";
import { db } from "./db";
import { randomUUID } from "crypto";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

export type PublicMenuItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image_url: string | null;
  sort_order: number;
};

export const getPublicMenu = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicMenuItem[]> => {
    try {
      const [rows]: any = await db.execute(
        "SELECT id, name, category, description, price, image_url, sort_order FROM menu_items WHERE is_available = 1 ORDER BY sort_order ASC, name ASC"
      );
      return (rows ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description || "",
        price: Number(row.price),
        image_url: row.image_url || null,
        sort_order: row.sort_order ?? 100,
      }));
    } catch (error: any) {
      throw new Error("Failed to load menu: " + error.message);
    }
  }
);

// Admin Endpoints
export type AdminMenuItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
};

export const getMenu = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AdminMenuItem[]> => {
    const [rows]: any = await db.execute(
      "SELECT id, name, category, description, price, image_url, sort_order, is_available FROM menu_items ORDER BY sort_order ASC, name ASC"
    );
    return (rows ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description || "",
      price: Number(row.price),
      image_url: row.image_url || null,
      sort_order: row.sort_order ?? 100,
      is_available: Boolean(row.is_available),
    }));
  });

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  price: z.number().min(0),
  image_url: z.string().nullable().optional(),
  sort_order: z.number().default(100),
  is_available: z.boolean(),
});

export const saveMenuItem = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.id) {
      await db.execute(
        `UPDATE menu_items 
         SET name = ?, category = ?, description = ?, price = ?, image_url = ?, sort_order = ?, is_available = ? 
         WHERE id = ?`,
        [data.name, data.category, data.description, data.price, data.image_url ?? null, data.sort_order, data.is_available ? 1 : 0, data.id]
      );
    } else {
      const id = randomUUID();
      await db.execute(
        `INSERT INTO menu_items (id, name, category, description, price, image_url, sort_order, is_available) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.name, data.category, data.description, data.price, data.image_url ?? null, data.sort_order, data.is_available ? 1 : 0]
      );
    }
    return { success: true };
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data }) => {
    await db.execute("DELETE FROM menu_items WHERE id = ?", [data]);
    return { success: true };
  });

const toggleSchema = z.object({
  id: z.string().uuid(),
  is_available: z.boolean(),
});

export const toggleMenuAvailability = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => toggleSchema.parse(d))
  .handler(async ({ data }) => {
    await db.execute("UPDATE menu_items SET is_available = ? WHERE id = ?", [data.is_available ? 1 : 0, data.id]);
    return { success: true };
  });

export const uploadMenuImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: { base64Data: string; fileName: string }) => data)
  .handler(async ({ data }) => {
    // Return the base64 string directly so the database can store it in the LONGTEXT column.
    // This entirely bypasses Vercel's read-only file system restrictions.
    return { imageUrl: data.base64Data };
  });