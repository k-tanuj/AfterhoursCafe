import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
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

    const messages = (historyRows ?? [])
      .filter((r: any) => r.role !== 'system')
      .map((r: any) => ({
      role: r.role,
      content: r.content,
    }));

    // Pull live menu
    const [menuRows]: any = await db.execute(
      "SELECT id, name, category, description, price, taste_profile, temperature, caffeine_level, dietary_tags FROM menu_items WHERE is_available = 1 ORDER BY popularity_score DESC LIMIT 60"
    );
    const menu = menuRows ?? [];

    const menuLine = menu
      .map((m: any) => `- ${m.name} (ID: ${m.id}, ${m.category}, ₹${m.price}) — ${m.description} | Taste: ${m.taste_profile} | Temp: ${m.temperature} | Caffeine: ${m.caffeine_level} | Dietary: ${m.dietary_tags}`)
      .join("\n");

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit' });
    const dayStr = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: 'long' });
    // Mock weather for ambiance
    const weathers = ["a quiet, misty night", "raining lightly outside", "a clear, starry night", "a bit chilly tonight"];
    const weather = weathers[now.getHours() % weathers.length];

    // Fetch user order history
    const userEmail = context.user?.email;
    let orderHistory = "";
    if (userEmail) {
      const [pastOrders]: any = await db.execute(
        "SELECT order_date, items_json FROM orders WHERE email = ? ORDER BY created_at DESC LIMIT 3",
        [userEmail]
      );
      if (pastOrders && pastOrders.length > 0) {
        orderHistory = "\n### USER'S PAST ORDERS (Use this to personalize recommendations or 'the usual'):\n";
        pastOrders.forEach((o: any) => {
          if (o.items_json) {
            try {
               const items = JSON.parse(o.items_json);
               const itemNames = items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ');
               orderHistory += `- ${o.order_date}: ${itemNames}\n`;
            } catch (e) {}
          }
        });
      }
    }

    const system = `You are "Buddy" — the late-night companion at AFTERHOURS, a chill café open from 12 pm to 3 am.
Current context: It is ${timeStr} on a ${dayStr}, and it is ${weather}. Use this to set the mood!

You are NOT just a menu bot. You're the friend at the next table. Be warm, witty, a little poetic, never preachy. Keep replies short (1–3 sentences). Casual lowercase tone is okay. Mix English + Hindi/Hinglish naturally if the user does.

### CAFÉ KNOWLEDGE (Use this to answer customer FAQs):
- Hours: Open every day from 12 PM to 3 AM.
- Location: 123 AfterHours Avenue, in the heart of the city.
- Wi-Fi: Network "AfterHours_Guest", password "afterhours123".
- Parking: Free parking is available right behind the café building.
- Dietary: We have vegan and gluten-free options. Oat and Soy milk alternatives available for all coffees.
- Charging/Pets: Yes, charging points at every table. Pet-friendly patio.

### YOUR JOB:
You are a simple, text-based conversational bot. You should chat with the customer and recommend drinks from the menu based on their mood, time of day, and weather.
Do not attempt to show UI cards, book tables, or update carts. Just be a friendly voice recommending a good beverage.
If they ask for non-drink things, politely guide them back to drinks.

### USER CONTEXT
- Name: ${context.user?.display_name || 'Guest'}
- Email: ${context.user?.email || ''}${orderHistory}`;

    try {
      if (!key) throw new Error("Missing GROQ_API_KEY in environment variables. Did you restart your dev server?");
      
      const groq = createGroq({ apiKey: key });

      const response = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        system,
        messages,
      });

      const finalReply = response.text || "got it.";

      // Save assistant reply to DB
      await db.execute(
        "INSERT INTO chat_history (id, user_id, role, content) VALUES (UUID(), ?, 'assistant', ?)",
        [userId, finalReply]
      );

      return { reply: finalReply };
    } catch (e: unknown) {
      console.error("Buddy Chat Error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("Buddy is getting a lot of love right now — try again in a moment.");
      if (msg.includes("402")) throw new Error("Buddy's out of credits. Ask the owner to top up the AI workspace.");
      throw new Error(`Buddy zoned out for a second. Try again. Debug Error: ${msg}`);
    }
  });