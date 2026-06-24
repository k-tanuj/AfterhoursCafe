import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./auth.middleware";
import { db } from "./db";
import { OrderItem } from "./orders.functions";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((data: { filter?: 'today' | 'weekly' | 'monthly' | 'yearly' } | void) => data)
  .handler(async ({ data }) => {
    const filter = data?.filter || 'monthly';
    let intervalClause = "DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    if (filter === 'today') intervalClause = "CURDATE()";
    else if (filter === 'weekly') intervalClause = "DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    else if (filter === 'monthly') intervalClause = "DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    else if (filter === 'yearly') intervalClause = "DATE_SUB(CURDATE(), INTERVAL 365 DAY)";

    const [[periodStats]]: any = await db.execute(
      `SELECT SUM(amount) as revenue, COUNT(*) as orders FROM orders WHERE order_date >= ${intervalClause}`
    );

    const [[allTime]]: any = await db.execute(
      "SELECT SUM(amount) as revenue, COUNT(*) as orders FROM orders"
    );

    const revenuePeriod = Number(periodStats.revenue || 0);
    const ordersPeriod = Number(periodStats.orders || 0);
    const profitPeriod = revenuePeriod * 0.3; // 30% estimated profit margin

    return {
      period: {
        revenue: revenuePeriod,
        orders: ordersPeriod,
        profit: profitPeriod,
      },
      allTime: {
        revenue: Number(allTime.revenue || 0),
        orders: Number(allTime.orders || 0),
        profit: Number(allTime.revenue || 0) * 0.3,
      }
    };
  });

export const getMonthlyAnalytics = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((data: { filter?: 'today' | 'weekly' | 'monthly' | 'yearly' } | void) => data)
  .handler(async ({ data }) => {
    const filter = data?.filter || 'monthly';
    let intervalClause = "DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    if (filter === 'today') intervalClause = "CURDATE()";
    else if (filter === 'weekly') intervalClause = "DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    else if (filter === 'monthly') intervalClause = "DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    else if (filter === 'yearly') intervalClause = "DATE_SUB(CURDATE(), INTERVAL 365 DAY)";

    // Get sales grouped by day
    const [rows]: any = await db.execute(
      `SELECT order_date, SUM(amount) as daily_revenue 
       FROM orders 
       WHERE order_date >= ${intervalClause} 
       GROUP BY order_date 
       ORDER BY order_date ASC`
    );

    return (rows ?? []).map((r: any) => {
      let dateStr = "";
      if (r.order_date instanceof Date) {
        dateStr = r.order_date.toISOString().slice(0, 10);
      } else if (typeof r.order_date === "string") {
        dateStr = r.order_date.split("T")[0];
      }
      return {
        date: dateStr,
        revenue: Number(r.daily_revenue),
      };
    });
  });

export const getTopSellingItems = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((data: { filter?: 'today' | 'weekly' | 'monthly' | 'yearly' } | void) => data)
  .handler(async ({ data }) => {
    const filter = data?.filter || 'monthly';
    let intervalClause = "DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    if (filter === 'today') intervalClause = "CURDATE()";
    else if (filter === 'weekly') intervalClause = "DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    else if (filter === 'monthly') intervalClause = "DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    else if (filter === 'yearly') intervalClause = "DATE_SUB(CURDATE(), INTERVAL 365 DAY)";

    // Fetch recent orders with items_json
    const [orders]: any = await db.execute(
      `SELECT items_json FROM orders WHERE items_json IS NOT NULL AND items_json != 'null' AND order_date >= ${intervalClause} ORDER BY created_at DESC LIMIT 1000`
    );

    const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};

    for (const order of orders) {
      if (!order.items_json) continue;
      try {
        const items: OrderItem[] = JSON.parse(order.items_json);
        for (const item of items) {
          if (!itemCounts[item.id]) {
            itemCounts[item.id] = { name: item.name, quantity: 0, revenue: 0 };
          }
          itemCounts[item.id].quantity += item.quantity;
          itemCounts[item.id].revenue += item.price * item.quantity;
        }
      } catch (e) {
        // ignore parsing errors
      }
    }

    const topItems = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    return topItems;
  });
