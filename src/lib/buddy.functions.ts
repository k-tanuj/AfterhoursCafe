import { createServerFn } from "@tanstack/react-start";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
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
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY in environment variables.");

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

### THE MENU
When recommending items, pick 2-3 from this live menu:
${menuLine}

### STRICT TOOL USAGE RULES (CRITICAL):
1. **Menu Browsing / Ordering**: IF the user explicitly asks to see the menu, order something, or asks what you have (e.g. "show me your menu", "what cold drinks do you have", "want to order something", "I want a cappuccino"), ONLY THEN use the \`displayMenu\` tool. 
2. **Mood/Preference Recommendations**: IF the user asks for a recommendation (e.g. "I need caffeine", "study combo", "healthy option"), suggest specific items from the menu in text, AND use the \`displayMenu\` tool so they can click 'Add to Cart'.
3. **Table Reservations**: IF the user asks to book a table (e.g. "make a table reservation", "book a table for two"):
   - DO NOT use the \`displayMenu\` tool.
   - ALWAYS use the \`bookTable\` tool. If you lack details (date, time, party size, phone), the tool will instruct you to ask the user. Just output text asking for the missing details.
   - For modifications or cancellations, politely explain that you can only make new bookings right now, but they can call the café for changes.
4. **Feedback**: IF the user expresses strong sentiment (e.g. "the coffee was terrible", "loved the vibe"), ALWAYS use the \`submitFeedback\` tool silently, and reply compassionately.
5. **Cart/Checkout**: IF the user asks about their cart or checkout (e.g. "whats in my cart", "checkout"), explain politely that they can view their cart and checkout using the floating cart button on the screen.
6. **Multi-Intent**: IF the user asks for two things (e.g. "suggest a coffee and book a table"), handle the conversation one step at a time, prioritizing the table reservation details.
7. **DO NOT hallucinate tools**: Invoke tools natively. No markdown.

### USER CONTEXT
- Name: ${context.user?.display_name || 'Guest'}
- Email: ${context.user?.email || ''}${orderHistory}`;

    const google = createGoogleGenerativeAI({ apiKey: key });

    try {
      const response = await generateText({
        model: google("gemini-2.5-flash"),
        system,
        messages,
        tools: {
          displayMenu: tool({
            description: "Display an interactive, visual menu to the user. Use this when the user asks to see the menu, a category, or when you are recommending specific items.",
            parameters: z.object({
              category: z.string().optional().describe("The category to filter by (e.g. 'Toast', 'Signature', 'Snacks'). Leave empty to show all items."),
              itemIds: z.array(z.string()).optional().describe("Specific item IDs to display. Use this when recommending specific items from the menu."),
            }),
            execute: async ({ category, itemIds }) => {
              // The frontend intercepts this to render the rich UI menu
              return { success: true, category, itemIds };
            },
          }),
          bookTable: tool({
            description: "Book a table for the user. If you are missing details, call this tool anyway and it will tell you what to ask.",
            parameters: z.object({
              booking_date: z.string().optional().describe("Date in YYYY-MM-DD format"),
              booking_time: z.string().optional().describe("Time in HH:MM format (e.g. 19:30)"),
              party: z.number().optional().describe("Number of guests"),
              guest_phone: z.string().optional().describe("The guest's phone number"),
            }),
            execute: async ({ booking_date, booking_time, party, guest_phone }) => {
              if (!booking_date || !booking_time || !party || !guest_phone) {
                return { success: false, message: "Missing details. Ask the user for the missing reservation details (date, time, party size, and phone number) to proceed." };
              }
              const [userRows]: any = await db.execute("SELECT display_name, email FROM users WHERE id = ?", [userId]);
              const guest_name = userRows[0]?.display_name || "Guest";
              const guest_email = userRows[0]?.email || "guest@example.com";

              const [tables]: any = await db.execute(
                "SELECT id, table_no, capacity FROM restaurant_tables WHERE is_active = 1 AND capacity >= ? ORDER BY capacity ASC",
                [party]
              );
              if (!tables || tables.length === 0) return { success: false, message: "Sorry, we don't have tables large enough for your party." };

              const [taken]: any = await db.execute(
                "SELECT table_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status NOT IN ('cancelled', 'no_show')",
                [booking_date, booking_time]
              );
              const busy = new Set((taken ?? []).map((r: any) => r.table_id));
              const pick = tables.find((t: any) => !busy.has(t.id));
              if (!pick) return { success: false, message: "Sorry, all tables are fully booked for that time slot. Can we try a different time?" };

              const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
              let code = "AH-";
              for (let i = 0; i < 6; i++) code += a[Math.floor(Math.random() * a.length)];

              await db.execute(
                `INSERT INTO bookings (
                  id, user_id, booking_date, booking_time, party,
                  guest_name, guest_phone, guest_email, status,
                  table_id, reference_code
                ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
                [userId, booking_date, booking_time, party, guest_name, guest_phone, guest_email, pick.id, code]
              );

              return { success: true, message: `Table ${pick.table_no} is successfully booked! The reference code is ${code}. Tell the user they are all set.` };
            }
          }),
          submitFeedback: tool({
            description: "Submit customer feedback about their food, experience, or the café. Use this if the user expresses strong sentiment (positive or negative) about their order or visit.",
            parameters: z.object({
              rating: z.number().min(1).max(5).optional().describe("Estimated rating based on sentiment (1 for terrible, 5 for amazing)"),
              message: z.string().optional().describe("The feedback message to log"),
            }),
            execute: async ({ rating, message }) => {
              if (!rating || !message) {
                 return { success: false, message: "Missing feedback details. Ask the user to clarify their feedback." };
              }
              await db.execute(
                `INSERT INTO feedback (id, user_id, rating, message) VALUES (UUID(), ?, ?, ?)`,
                [userId, rating, `[Via Buddy] ${message}`]
              );
              return { success: true, message: "Feedback logged! Thank the user for their feedback." };
            }
          })
        },
        maxSteps: 2,
      });

      let rawText = response.text || "";
      let manualToolCalls: any[] = [];
      if (response.steps && response.steps.length > 0) {
        response.steps.forEach(step => {
          if (step.toolCalls) manualToolCalls.push(...step.toolCalls);
        });
      } else if (response.toolCalls) {
        manualToolCalls = [...response.toolCalls];
      }

      // Fix Groq LLaMA model leaking tool calls as raw text
      const functionRegex = /<function=(\w+)>(.*?)<\/function>/g;
      let finalReply = rawText.replace(functionRegex, (match, toolName, argsStr) => {
        if (toolName === "displayMenu") {
          let args = {};
          try { if (argsStr) args = JSON.parse(argsStr); } catch (e) {}
          manualToolCalls.push({
            toolCallId: "manual-" + Math.random().toString(36).substring(7),
            toolName: "displayMenu",
            args
          });
        }
        return ""; // remove the tag from the text
      });

      // Also catch hallucinated brackets like [displayMenu] or [Action taken: displayMenu]
      const bracketRegex = /\[(?:Action taken:\s*)?(displayMenu|showMenu)\]/gi;
      finalReply = finalReply.replace(bracketRegex, (match, toolName) => {
        manualToolCalls.push({
          toolCallId: "manual-" + Math.random().toString(36).substring(7),
          toolName: "displayMenu",
          args: {}
        });
        return "";
      }).trim();

      if (!finalReply && manualToolCalls.length > 0) {
        const tc = manualToolCalls[0];
        if (tc.toolName === 'displayMenu') {
          finalReply = `Here are some options for you! Let me know what you'd like.`;
        } else if (tc.toolName === 'submitFeedback') {
          finalReply = `I've noted that down and shared it with the team. Thanks for letting us know!`;
        }
      }

      finalReply = finalReply || "got it."; // ultimate fallback just in case

      // Save assistant reply to DB
      await db.execute(
        "INSERT INTO chat_history (id, user_id, role, content) VALUES (UUID(), ?, 'assistant', ?)",
        [userId, finalReply]
      );

      // If tools were called, also save a system message so history doesn't break
      if (manualToolCalls.length > 0) {
         await db.execute(
          "INSERT INTO chat_history (id, user_id, role, content) VALUES (UUID(), ?, 'system', ?)",
          [userId, `[Action taken: ${manualToolCalls.map(t => t.toolName).join(', ')}]`]
        );
      }

      // Enrich displayMenu tool calls with actual menu item data
      const enrichedToolCalls = manualToolCalls.map((tc: any) => {
        if (tc.toolName === 'displayMenu') {
          const args = tc.args || {};
          const { category, itemIds } = args;
          let filteredItems = menu;
          if (itemIds && itemIds.length > 0) {
            filteredItems = menu.filter((m: any) => itemIds.includes(m.id));
          } else if (category) {
            filteredItems = menu.filter((m: any) => m.category.toLowerCase().includes(category.toLowerCase()));
          }
          
          // If no specific items requested and no category, just show a few random items
          if (!itemIds && !category) {
            filteredItems = menu.slice(0, 5); 
          }

          return {
            ...tc,
            args: {
              ...tc.args,
              items: filteredItems // Attach the full item objects so frontend can render them
            }
          };
        }
        return tc;
      });

      console.log("BUDDY RESPONSE TEXT:", JSON.stringify(finalReply));
      console.log("BUDDY RESPONSE TOOL CALLS:", JSON.stringify(enrichedToolCalls));

      return { 
        reply: finalReply, 
        toolCalls: enrichedToolCalls 
      };
    } catch (e: unknown) {
      console.error("Buddy Chat Error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("Buddy is getting a lot of love right now — try again in a moment.");
      if (msg.includes("402")) throw new Error("Buddy's out of credits. Ask the owner to top up the AI workspace.");
      throw new Error(`Buddy zoned out for a second. Try again. Debug Error: ${msg}`);
    }
  });