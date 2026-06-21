import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth.middleware";
import { db } from "./db";

export type MyLoyalty = {
  stamps: number;
  last_stamp_date: string | null;
  email: string | null;
};

export const getMyLoyalty = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<MyLoyalty> => {
    const email = context.user.email;
    if (!email) return { stamps: 0, last_stamp_date: null, email: null };

    const [rows]: any = await db.execute(
      "SELECT stamps, last_stamp_date FROM customers WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return { stamps: 0, last_stamp_date: null, email };
    }

    const data = rows[0];
    
    // Format the date to YYYY-MM-DD if it exists
    let lastStamp = null;
    if (data.last_stamp_date) {
      if (data.last_stamp_date instanceof Date) {
        lastStamp = data.last_stamp_date.toISOString().slice(0, 10);
      } else if (typeof data.last_stamp_date === "string") {
        lastStamp = data.last_stamp_date.split("T")[0];
      }
    }

    return {
      stamps: data.stamps ?? 0,
      last_stamp_date: lastStamp,
      email,
    };
  });