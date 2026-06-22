import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth.middleware";
import { db } from "./db";

export type MyLoyalty = {
  stamps: number;
  last_stamp_date: string | null;
  email: string | null;
  stamp_dates: string[];
};

export const getMyLoyalty = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<MyLoyalty> => {
    const email = context.user.email;
    if (!email) return { stamps: 0, last_stamp_date: null, email: null, stamp_dates: [] };

    const [rows]: any = await db.execute(
      "SELECT stamps, last_stamp_date FROM customers WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return { stamps: 0, last_stamp_date: null, email, stamp_dates: [] };
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

    // Fetch the dates of all orders where a stamp was awarded
    const [orderRows]: any = await db.execute(
      "SELECT order_date FROM orders WHERE email = ? AND stamp_awarded = 1 ORDER BY order_date ASC",
      [email]
    );

    const stamp_dates = (orderRows ?? []).map((o: any) => {
      let d = o.order_date;
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      if (typeof d === "string") {
         if (d.includes("T")) return d.split("T")[0];
         if (d.includes(" ")) return d.split(" ")[0];
         return d;
      }
      return d;
    });

    return {
      stamps: data.stamps ?? 0,
      last_stamp_date: lastStamp,
      email,
      stamp_dates,
    };
  });