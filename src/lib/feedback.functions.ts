import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCurrentUser } from "./auth.functions";
import { db } from "./db";
import { randomUUID } from "crypto";

const feedbackSchema = z.object({
  name: z.string().max(120),
  email: z.string().email().max(200),
  message: z.string().max(2000),
  rating: z.number().int().min(0).max(5).optional(),
  suggestion: z.string().max(1000).optional(),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => feedbackSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const userId = user?.id || null;

    let finalMessage = `From: ${data.name} <${data.email}>\n\n${data.message}`;
    if (data.suggestion) {
      finalMessage += `\n\nSuggestion: ${data.suggestion}`;
    }

    const ratingToSave = data.rating && data.rating > 0 ? data.rating : 5; // Default to 5 if no rating given

    await db.execute(
      `INSERT INTO feedback (id, user_id, rating, message) VALUES (?, ?, ?, ?)`,
      [randomUUID(), userId, ratingToSave, finalMessage]
    );

    return { success: true };
  });
