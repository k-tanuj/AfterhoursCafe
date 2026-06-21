import { createServerFn } from "@tanstack/react-start";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createGroq } from "@ai-sdk/groq";
import { db } from "./db";
import { requireAuth } from "./auth.middleware";

// Fetch chat history for the logged-in user
export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const [rows]: any = await db.execute(
      "SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY created_at ASC",
      [userId]
    );
    return (rows ?? []).map((r: any) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
    }));
  });

const inputSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const chatWithBuddy = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ reply: string; toolCalls?: any[] }> => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("Missing GROQ_API_KEY");

    const userId = context.user.id;

    // Save user message to DB
    await db.execute(
      "INSERT INTO chat_history (id, user_id, role, content) VALUES (UUID(), ?, 'user', ?)",
      [userId, data.message]
    );

    // Fetch history
    const [historyRows]: any = await db.execute(
      "SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY created_at ASC LIMIT 50",
      [userId]
    );

    const messages = (historyRows ?? []).map((r: any) => ({
      role: r.role === 'system' ? 'assistant' : r.role,
      content: r.content,
    }));

    // Pull live menu
    const [menuRows]: any = await db.execute(
      "SELECT id, name, category, description, price FROM menu_items WHERE is_available = 1 LIMIT 60"
    );
    const menu = menuRows ?? [];

    const menuLine = menu
      .map((m: any) => `- ${m.name} (ID: ${m.id}, ${m.category}, ₹${m.price})${m.description ? ` — ${m.description}` : ""}`)
      .join("\n");

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit' });
    const dayStr = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: 'long' });
    // Mock weather for ambiance
    const weathers = ["a quiet, misty night", "raining lightly outside", "a clear, starry night", "a bit chilly tonight"];
    const weather = weathers[now.getHours() % weathers.length];

    const system = `You are "Buddy" — the late-night companion at AFTERHOURS, a chill café open from 12 pm to 3 am.
Current context: It is ${timeStr} on a ${dayStr}, and it is ${weather}. Use this to set the mood!

You are NOT just a menu bot. You're the friend at the next table:
- chat about life, work, study, music, movies, breakups, ideas, dumb questions
- read the user's mood; be warm, witty, a little poetic, never preachy
- short replies (1–4 sentences max). casual lowercase tone okay
- mix English + Hindi/Hinglish naturally if the user does. never force it

When recommending items, pick 2-3 from this live menu based on their mood/time:
${menuLine}

IMPORTANT: You now have tools! 
- If the user asks you to add something to their cart or order something, use the \`addToCart\` tool.
- If they ask to see the menu, use the \`showMenu\` tool to render a beautiful UI instead of listing items as text.`;

    const groq = createGroq({ apiKey: key });

    try {
      const response = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        system,
        messages,
        tools: {
          addToCart: tool({
            description: "Add a specific menu item to the user's cart.",
            parameters: z.object({
              itemId: z.string().describe("The exact ID of the menu item from the live menu list."),
              quantity: z.number().describe("The number of items to add."),
              itemName: z.string().describe("The name of the item to confirm to the user."),
            }),
            execute: async ({ itemId, quantity, itemName }) => {
              // The actual cart addition happens on the frontend using tool results.
              return { success: true, message: `Added ${quantity}x ${itemName} to cart.` };
            },
          }),
          showMenu: tool({
            description: "Display an interactive, visual menu to the user.",
            parameters: z.object({
              category: z.string().describe("The category to filter by (e.g. 'Sweet', 'Strong', or 'All')"),
            }),
            execute: async ({ category }) => {
              // Frontend intercepts this to render the rich UI menu
              return { success: true, category };
            },
          })
        }
      });

      let finalReply = response.text;

      if (!finalReply && response.toolCalls && response.toolCalls.length > 0) {
        const tc = response.toolCalls[0];
        if (tc.toolName === 'addToCart') {
          finalReply = `Got it. Added ${tc.args.itemName} to your cart.`;
        } else if (tc.toolName === 'showMenu') {
          finalReply = `Here's the menu! Let me know if anything catches your eye.`;
        }
      }

      finalReply = finalReply || "got it."; // ultimate fallback just in case

      // Save assistant reply to DB
      await db.execute(
        "INSERT INTO chat_history (id, user_id, role, content) VALUES (UUID(), ?, 'assistant', ?)",
        [userId, finalReply]
      );

      // If tools were called, also save a system message so history doesn't break
      if (response.toolCalls && response.toolCalls.length > 0) {
         await db.execute(
          "INSERT INTO chat_history (id, user_id, role, content) VALUES (UUID(), ?, 'system', ?)",
          [userId, `[Action taken: ${response.toolCalls.map(t => t.toolName).join(', ')}]`]
        );
      }

      console.log("BUDDY RESPONSE TEXT:", JSON.stringify(finalReply));
      console.log("BUDDY RESPONSE TOOL CALLS:", JSON.stringify(response.toolCalls));

      return { 
        reply: finalReply, 
        toolCalls: response.toolCalls 
      };
    } catch (e: unknown) {
      console.error("Buddy Chat Error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("Buddy is getting a lot of love right now — try again in a moment.");
      if (msg.includes("402")) throw new Error("Buddy's out of credits. Ask the owner to top up the AI workspace.");
      throw new Error(`Buddy zoned out for a second. Try again. Debug Error: ${msg}`);
    }
  });