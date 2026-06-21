import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth.middleware";
import { db } from "./db";
import { randomUUID } from "crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type ChillNoteRow = {
  id: string;
  text: string;
  who: string | null;
  created_at: string;
};

export type PolaroidRow = {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
};

export const getChillNotes = createServerFn({ method: "GET" }).handler(
  async (): Promise<ChillNoteRow[]> => {
    const [rows]: any = await db.execute(
      "SELECT id, text, who, created_at FROM chill_notes ORDER BY created_at DESC LIMIT 15"
    );
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      text: r.text,
      who: r.who,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  }
);

export const postChillNote = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: { text: string; who: string | null }) => data)
  .handler(async ({ data, context }) => {
    const noteId = randomUUID();
    await db.execute(
      "INSERT INTO chill_notes (id, user_id, text, who) VALUES (?, ?, ?, ?)",
      [noteId, context.userId, data.text.trim().slice(0, 240), data.who?.trim().slice(0, 40) || null]
    );
    return { success: true };
  });

export const getMemoryPolaroids = createServerFn({ method: "GET" }).handler(
  async (): Promise<PolaroidRow[]> => {
    const [rows]: any = await db.execute(
      "SELECT id, photo_url, caption, created_at FROM memory_polaroids ORDER BY created_at DESC LIMIT 15"
    );
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      photo_url: r.photo_url,
      caption: r.caption,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  }
);

export const getMyPolaroids = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<PolaroidRow[]> => {
    const [rows]: any = await db.execute(
      "SELECT id, photo_url, caption, created_at FROM memory_polaroids WHERE user_id = ? ORDER BY created_at DESC",
      [context.userId]
    );
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      photo_url: r.photo_url,
      caption: r.caption,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  });

export const postMemoryPolaroid = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: { photoUrl: string; caption: string | null }) => data)
  .handler(async ({ data, context }) => {
    const polaroidId = randomUUID();
    await db.execute(
      "INSERT INTO memory_polaroids (id, user_id, photo_url, caption) VALUES (?, ?, ?, ?)",
      [polaroidId, context.userId, data.photoUrl, data.caption?.trim().slice(0, 60) || null]
    );
    return { success: true };
  });

export const uploadPolaroid = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: { base64Data: string; fileName: string }) => data)
  .handler(async ({ data, context }) => {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Remove data:image/...;base64, prefix if present
    const base64Content = data.base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Content, "base64");

    const ext = path.extname(data.fileName) || ".jpg";
    const newFileName = `${context.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, newFileName);

    await fs.writeFile(filePath, buffer);

    // Return the relative URL path served by Vite
    return { photoUrl: `/uploads/${newFileName}` };
  });
