import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./auth.middleware";
import { db } from "./db";
import { randomUUID } from "crypto";

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type OrderRow = {
  id: string;
  customer_name: string;
  email: string;
  amount: number;
  order_date: string;
  stamp_awarded: boolean;
  items_json: string | null;
  created_at: string;
};

export type CustomerRow = {
  id: string;
  email: string;
  name: string;
  stamps: number;
  last_stamp_date: string | null;
};

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const today = () => getLocalDateString();

function formatDateString(dateVal: any): string {
  if (!dateVal) return today();
  
  if (dateVal instanceof Date) {
    return getLocalDateString(dateVal);
  }
  
  if (typeof dateVal === "string") {
    // If it's already exactly YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
    
    // If it has a timestamp like YYYY-MM-DD HH:MM:SS or YYYY-MM-DDT...
    if (dateVal.includes("T")) return dateVal.split("T")[0];
    if (dateVal.includes(" ")) return dateVal.split(" ")[0];
    
    return dateVal;
  }
  
  try {
    return getLocalDateString(new Date(dateVal));
  } catch (e) {
    return today();
  }
}

export const getRecentOrders = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((data: { date?: string } | void) => data)
  .handler(async ({ data }): Promise<OrderRow[]> => {
    let query = "SELECT id, customer_name, email, amount, order_date, stamp_awarded, items_json, created_at FROM orders ";
    const params: any[] = [];
    
    if (data && data.date) {
      query += "WHERE order_date = ? ORDER BY created_at DESC LIMIT 100";
      params.push(data.date);
    } else {
      query += "ORDER BY created_at DESC LIMIT 15";
    }
    
    const [rows]: any = await db.execute(query, params);
    
    return (rows ?? []).map((o: any) => ({
      id: o.id,
      customer_name: o.customer_name,
      email: o.email,
      amount: Number(o.amount),
      order_date: formatDateString(o.order_date),
      stamp_awarded: Boolean(o.stamp_awarded),
      items_json: o.items_json ?? null,
      created_at: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
    }));
  });

export const getTopLoyaltyCustomers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<CustomerRow[]> => {
    const [rows]: any = await db.execute(
      "SELECT id, email, name, stamps, last_stamp_date FROM customers ORDER BY stamps DESC LIMIT 10"
    );
    return (rows ?? []).map((c: any) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      stamps: c.stamps,
      last_stamp_date: c.last_stamp_date ? formatDateString(c.last_stamp_date) : null,
    }));
  });

export const logOfflineOrder = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: { 
    name: string; 
    email: string; 
    amount: number; 
    date: string;
    items?: OrderItem[] | null;
    table_id?: string | null;
    booking_time?: string | null;
  }) => data)
  .handler(async ({ data, context }) => {
    const { name, email, amount, date, items, table_id, booking_time } = data;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const itemsJson = items ? JSON.stringify(items) : null;
    
    // 1. Get or create customer by email
    const [customers]: any = await db.execute("SELECT * FROM customers WHERE email = ?", [cleanEmail]);
    let customer: CustomerRow;
    
    if (customers.length > 0) {
      customer = customers[0];
    } else {
      const customerId = randomUUID();
      await db.execute(
        "INSERT INTO customers (id, email, name, stamps, last_stamp_date) VALUES (?, ?, ?, 0, null)",
        [customerId, cleanEmail, cleanName]
      );
      customer = {
        id: customerId,
        email: cleanEmail,
        name: cleanName,
        stamps: 0,
        last_stamp_date: null,
      };
    }

    const lastStampStr = customer.last_stamp_date ? formatDateString(customer.last_stamp_date) : null;
    const eligible = amount >= 200 && lastStampStr !== date;
    const orderId = randomUUID();

    // 2. Insert order
    await db.execute(
      `INSERT INTO orders (id, customer_id, customer_name, email, amount, order_date, stamp_awarded, logged_by, items_json) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        customer.id,
        cleanName,
        cleanEmail,
        amount,
        date,
        eligible ? 1 : 0,
        context.userId,
        itemsJson,
      ]
    );

    // 3. Update customer stamps if eligible
    let newStamps = customer.stamps;
    if (eligible) {
      newStamps = Math.min(10, (customer.stamps ?? 0) + 1);
      await db.execute(
        "UPDATE customers SET stamps = ?, last_stamp_date = ?, name = ? WHERE id = ?",
        [newStamps, date, cleanName, customer.id]
      );
    }

    // 4. Create a booking if table assignment is requested
    if (table_id && booking_time) {
      const bookingId = randomUUID();
      await db.execute(
        `INSERT INTO bookings (id, user_id, table_id, booking_date, booking_time, party, guest_name, guest_email, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'seated', NOW())`,
        [bookingId, context.userId, table_id, date, booking_time, 1, cleanName, cleanEmail]
      );
    }

    return {
      success: true,
      eligible,
      newStamps,
    };
  });

export const submitCustomerOrder = createServerFn({ method: "POST" })
  .validator((data: { 
    name: string; 
    email: string; 
    amount: number; 
    date: string;
    items?: OrderItem[] | null;
  }) => data)
  .handler(async ({ data }) => {
    const { name, email, amount, date, items } = data;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const itemsJson = items ? JSON.stringify(items) : null;
    
    // 1. Get or create customer by email
    const [customers]: any = await db.execute("SELECT * FROM customers WHERE email = ?", [cleanEmail]);
    let customer: CustomerRow;
    
    if (customers.length > 0) {
      customer = customers[0];
    } else {
      const customerId = randomUUID();
      await db.execute(
        "INSERT INTO customers (id, email, name, stamps, last_stamp_date) VALUES (?, ?, ?, 0, null)",
        [customerId, cleanEmail, cleanName]
      );
      customer = {
        id: customerId,
        email: cleanEmail,
        name: cleanName,
        stamps: 0,
        last_stamp_date: null,
      };
    }

    const lastStampStr = customer.last_stamp_date ? formatDateString(customer.last_stamp_date) : null;
    const eligible = amount >= 200 && lastStampStr !== date;
    const orderId = randomUUID();

    // 2. Insert order (logged_by is 'online' or null)
    await db.execute(
      `INSERT INTO orders (id, customer_id, customer_name, email, amount, order_date, stamp_awarded, logged_by, items_json) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        customer.id,
        cleanName,
        cleanEmail,
        amount,
        date,
        eligible ? 1 : 0,
        null,
        itemsJson,
      ]
    );

    // 3. Update customer stamps if eligible
    let newStamps = customer.stamps;
    if (eligible) {
      newStamps = Math.min(10, (customer.stamps ?? 0) + 1);
      await db.execute(
        "UPDATE customers SET stamps = ?, last_stamp_date = ?, name = ? WHERE id = ?",
        [newStamps, date, cleanName, customer.id]
      );
    }

    return {
      success: true,
      eligible,
      newStamps,
    };
  });

