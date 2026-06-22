import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getRecentOrders, getTopLoyaltyCustomers, logOfflineOrder, updateOrderStatus, type OrderRow, type CustomerRow, type OrderItem } from "@/lib/orders.functions";
import { getMenu } from "@/lib/menu.functions";
import { getAdminTables, getAdminBookings, type AdminTable, type AdminBookingRow } from "@/lib/admin.functions";
import { Stamp } from "@/components/Doodles";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export function AdminOrders() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  
  // Table / Booking states
  const [orderType, setOrderType] = useState<"takeaway" | "dine-in">("takeaway");
  const [bookingTime, setBookingTime] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);

  // Cart/Billing builder states
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<OrderRow | null>(null);

  const fetchOrders = useServerFn(getRecentOrders);
  const fetchTopCustomers = useServerFn(getTopLoyaltyCustomers);
  const doLogOrder = useServerFn(logOfflineOrder);
  const fetchMenu = useServerFn(getMenu);
  const fetchTables = useServerFn(getAdminTables);
  const fetchBookings = useServerFn(getAdminBookings);
  const changeOrderStatus = useServerFn(updateOrderStatus);

  const [filterDate, setFilterDate] = useState<string>("");

  const loadAll = async () => {
    try {
      const [c, m, tData, bData] = await Promise.all([
        fetchTopCustomers(),
        fetchMenu(),
        fetchTables(),
        fetchBookings()
      ]);
      setCustomers(c);
      setMenuItems((m ?? []).filter((item: any) => item.is_available));
      setTables(tData);
      setBookings(bData);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const loadOrders = async () => {
    try {
      const o = await fetchOrders({ data: { date: filterDate || undefined } });
      setOrders(o);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadOrders(); }, [filterDate]);

  const handleStatusChange = async (id: string, status: 'placed' | 'preparing' | 'completed') => {
    try {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      await changeOrderStatus({ data: { id, status } });
      loadOrders(); // Refresh to ensure correct order
    } catch (e: any) {
      toast.error(e.message);
      loadOrders(); // Revert on failure
    }
  };

  // Update amount automatically based on cart items
  useEffect(() => {
    if (cart.length > 0) {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      setAmount(total.toString());
    } else {
      setAmount("");
    }
  }, [cart]);

  const addToCart = () => {
    if (!selectedItemId) return;
    const item = menuItems.find(m => m.id === selectedItemId);
    if (!item) return;

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
    setSelectedItemId("");
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const next = i.quantity + delta;
        return next > 0 ? { ...i, quantity: next } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const logOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const amt = Number(amount);
    if (!cleanName || !cleanEmail || !amt || amt <= 0) {
      toast.error("fill name, email, amount.");
      return;
    }
    if (orderType === "dine-in" && (!selectedTableId || !bookingTime)) {
      toast.error("select a table and time for dine-in.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("enter a valid email.");
      return;
    }
    setBusy(true);

    try {
      const res = await doLogOrder({
        data: {
          name: cleanName,
          email: cleanEmail,
          amount: amt,
          date,
          items: cart.length > 0 ? cart : null,
          table_id: orderType === "dine-in" ? selectedTableId : null,
          booking_time: orderType === "dine-in" ? bookingTime : null,
        }
      });

      if (res.eligible) {
        toast.success(`+1 stamp → ${res.newStamps}/10`);
      } else if (amt < 200) {
        toast.message("order logged · no stamp (under ₹200).");
      } else {
        toast.message("order logged · already stamped today.");
      }

      setName(""); setEmail(""); setAmount(""); setDate(today());
      setCart([]);
      loadAll();
      loadOrders();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = (order: OrderRow) => {
    const items: OrderItem[] = order.items_json ? JSON.parse(order.items_json) : [];
    const printWindow = window.open("", "_blank", "width=600,height=850");
    if (!printWindow) {
      toast.error("Popup blocker prevented print window.");
      return;
    }
    
    const itemsHtml = items.map(it => `
      <tr>
        <td style="padding: 8px 0; font-family: monospace; font-size: 14px;">${it.name} x ${it.quantity}</td>
        <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 14px;">₹${(it.price * it.quantity).toFixed(0)}</td>
      </tr>
    `).join("");

    const stampsHtml = order.stamp_awarded 
      ? `<div style="margin-top: 20px; border: 2px dashed #e63946; padding: 12px; text-align: center; color: #e63946; font-weight: bold; font-family: monospace; font-size: 14px;">
           ★ LOYALTY STAMP AWARDED
         </div>`
      : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - AFTERHOURS</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              color: #1d1d1d;
              padding: 30px 20px;
              max-width: 380px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
            }
            .title {
              font-size: 26px;
              font-weight: bold;
              letter-spacing: 3px;
              text-transform: uppercase;
            }
            .subtitle {
              font-size: 12px;
              opacity: 0.8;
              margin-top: 5px;
            }
            .divider {
              border-top: 2px dashed #1d1d1d;
              margin: 20px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            .total {
              font-size: 20px;
              font-weight: bold;
              text-align: right;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              opacity: 0.7;
              margin-top: 40px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div class="title">afterhours</div>
            <div class="subtitle">see you after hours.</div>
          </div>
          <div class="divider"></div>
          <div style="font-size: 13px; line-height: 1.5; font-family: monospace;">
            <strong>Receipt ID:</strong> ${order.id.slice(0, 8).toUpperCase()}<br>
            <strong>Date:</strong> ${order.order_date}<br>
            <strong>Customer:</strong> ${order.customer_name}<br>
            <strong>Email:</strong> ${order.email}
          </div>
          <div class="divider"></div>
          <table>
            ${itemsHtml || `<tr><td style="padding: 8px 0; font-family: monospace;">Custom Order</td><td style="padding: 8px 0; text-align: right; font-family: monospace;">₹${Number(order.amount).toFixed(0)}</td></tr>`}
          </table>
          <div class="divider"></div>
          <div class="total">TOTAL: ₹${Number(order.amount).toFixed(0)}</div>
          ${stampsHtml}
          <div class="footer">
            THANK YOU FOR VISITING<br>
            Open 12 PM - 3 AM · Every Night
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white/60 border border-ink/10 p-6 shadow-sm lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-3xl">Offline Orders</h3>
        <Stamp className="size-7 text-accent" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-6">
        log a walk-in order · ₹200+ auto-awards a stamp (max 1/day per customer)
      </p>

      {(() => {
        const activeTables = tables.filter(t => t.is_active);
        const dateBookings = bookings.filter(b => b.booking_date === date && b.table_no !== null && !["cancelled", "no_show"].includes(b.status));
        
        let vacantTables = activeTables;
        if (orderType === "dine-in" && bookingTime) {
          const occupiedTableNos = new Set(dateBookings.filter(b => b.booking_time === bookingTime).map(b => b.table_no));
          vacantTables = activeTables.filter(t => !occupiedTableNos.has(t.table_no));
        }

        return (
          <form onSubmit={logOrder} className="space-y-6 mb-10">
            {/* Customer Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Customer name</span>
                <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. Jane Doe" maxLength={80} required
                  className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent w-full" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Email address</span>
                <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="e.g. jane@example.com" type="email" maxLength={255} required
                  className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent w-full" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Order Date</span>
                <input value={date} onChange={(e)=>setDate(e.target.value)} type="date" required
                  className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent w-full" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Order Type</span>
                <select value={orderType} onChange={(e) => setOrderType(e.target.value as any)} className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent w-full">
                  <option value="takeaway">Takeaway</option>
                  <option value="dine-in">Dine-in</option>
                </select>
              </label>
            </div>

            {orderType === "dine-in" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-accent/5 p-4 border border-accent/20">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Time Slot</span>
                  <input value={bookingTime} onChange={(e)=>setBookingTime(e.target.value)} type="time" required
                    className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent w-full" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Assign Table (Vacant only)</span>
                  <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} required className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent w-full">
                    <option value="">-- Select Vacant Table --</option>
                    {vacantTables.map(t => (
                      <option key={t.id} value={t.id}>{t.table_no} (Cap: {t.capacity})</option>
                    ))}
                  </select>
                </label>
              </div>
            )}


        {/* Cart/Bill Builder Section */}
        <div className="border border-ink/10 p-4 bg-paper/30">
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3 font-semibold">Bill Itemization</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Item Panel */}
            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Select menu item</span>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent w-full"
                >
                  <option value="">-- Choose item --</option>
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (₹{item.price})</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={addToCart}
                className="w-full bg-ink text-paper font-display text-lg py-2 hover:scale-[1.01] transition-transform"
              >
                + Add item to bill
              </button>
            </div>

            {/* Cart Panel */}
            <div className="space-y-3 font-mono text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest opacity-60 block">Current bill items</span>
              {cart.length === 0 ? (
                <p className="text-ink/50 italic py-2">No items added. Enter manual amount or select items.</p>
              ) : (
                <div className="border border-ink/10 bg-white/40 divide-y divide-ink/5 max-h-40 overflow-auto">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2">
                      <div className="truncate pr-2 w-1/2">
                        <span className="font-semibold">{item.name}</span>
                        <span className="opacity-60 block text-[10px]">₹{item.price} each</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateQty(item.id, -1)} className="px-1.5 py-0.5 bg-ink/10 rounded font-bold hover:bg-ink/20">-</button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateQty(item.id, 1)} className="px-1.5 py-0.5 bg-ink/10 rounded font-bold hover:bg-ink/20">+</button>
                      </div>
                      <div className="text-right w-20">
                        <span className="text-accent">₹{item.price * item.quantity}</span>
                        <button type="button" onClick={() => removeFromCart(item.id)} className="text-[10px] text-red-600 ml-2 hover:underline">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing & Submit Row */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-ink/10 pt-4">
          <label className="flex flex-col gap-1 w-44">
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Total Bill Amount (₹)</span>
            <input value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0" type="number" min="0" step="1" required
              className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-base font-semibold focus:outline-none focus:border-accent text-accent" />
          </label>
          
          <button disabled={busy} className="bg-accent text-paper font-display text-2xl px-8 py-3 hover:scale-105 transition-transform disabled:opacity-50 ml-auto">
            {busy ? "logging..." : "log order & print bill →"}
          </button>
        </div>
      </form>
      );
      })()}

      {/* Kanban Board Row */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Order Queue</p>
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-paper/60 border border-ink/15 px-2 py-1 font-mono text-[10px] focus:outline-none focus:border-accent"
          />
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {/* Placed Column */}
          <div className="bg-ink/5 border border-ink/10 p-4 h-[600px] flex flex-col">
            <h4 className="font-display text-xl mb-4 text-ink flex justify-between items-center">
              Placed 
              <span className="bg-ink text-paper text-xs px-2 py-1 rounded-full">{orders.filter(o => o.status === 'placed').length}</span>
            </h4>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {orders.filter(o => o.status === 'placed').map(o => (
                <div key={o.id} className="bg-paper border border-ink/10 p-3 shadow-sm hover:border-accent/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold truncate max-w-[150px] text-sm" title={o.customer_name}>{o.customer_name}</p>
                    <p className="text-accent font-bold text-sm">₹{Number(o.amount).toFixed(0)}</p>
                  </div>
                  <p className="font-mono text-[10px] opacity-60 mb-1">{o.logged_by === null ? 'ONLINE' : 'WALK-IN'} · {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <p className="font-mono text-[10px] opacity-60 truncate mb-3">{o.email}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setReceiptOrder(o)} className="flex-1 py-1.5 border border-ink/20 font-mono text-[9px] uppercase hover:bg-ink/5">View Bill</button>
                    <button onClick={() => handleStatusChange(o.id, 'preparing')} className="flex-1 py-1.5 bg-ink text-paper font-mono text-[9px] uppercase hover:bg-ink/90">Move to Preparing</button>
                  </div>
                </div>
              ))}
              {orders.filter(o => o.status === 'placed').length === 0 && (
                <div className="text-center p-6 opacity-30 font-mono text-xs italic">No placed orders</div>
              )}
            </div>
          </div>

          {/* Preparing Column */}
          <div className="bg-accent/5 border border-accent/20 p-4 h-[600px] flex flex-col">
            <h4 className="font-display text-xl mb-4 text-accent flex justify-between items-center">
              Preparing
              <span className="bg-accent text-paper text-xs px-2 py-1 rounded-full">{orders.filter(o => o.status === 'preparing').length}</span>
            </h4>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {orders.filter(o => o.status === 'preparing').map(o => (
                <div key={o.id} className="bg-paper border-l-4 border-accent p-3 shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold truncate max-w-[150px] text-sm text-accent" title={o.customer_name}>{o.customer_name}</p>
                    <p className="font-bold text-sm">₹{Number(o.amount).toFixed(0)}</p>
                  </div>
                  <p className="font-mono text-[10px] opacity-60 mb-1">{o.logged_by === null ? 'ONLINE' : 'WALK-IN'} · {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <p className="font-mono text-[10px] opacity-60 truncate mb-3">{o.email}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setReceiptOrder(o)} className="flex-1 py-1.5 border border-ink/20 font-mono text-[9px] uppercase hover:bg-ink/5">View Bill</button>
                    <button onClick={() => handleStatusChange(o.id, 'completed')} className="flex-1 py-1.5 bg-accent text-paper font-mono text-[9px] uppercase hover:bg-accent/90">Mark as Given</button>
                  </div>
                </div>
              ))}
              {orders.filter(o => o.status === 'preparing').length === 0 && (
                <div className="text-center p-6 opacity-30 font-mono text-xs italic">Nothing in prep</div>
              )}
            </div>
          </div>

          {/* Completed Column */}
          <div className="bg-green-50 border border-green-200 p-4 h-[600px] flex flex-col">
            <h4 className="font-display text-xl mb-4 text-green-700 flex justify-between items-center">
              Gave the order
              <span className="bg-green-600 text-paper text-xs px-2 py-1 rounded-full">{orders.filter(o => o.status === 'completed').length}</span>
            </h4>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {[...orders].filter(o => o.status === 'completed').reverse().map(o => (
                <div key={o.id} className="bg-white border border-green-200 p-3 shadow-sm opacity-80">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold truncate max-w-[150px] text-sm text-green-800" title={o.customer_name}>{o.customer_name}</p>
                    <p className="text-green-800 font-bold text-sm">₹{Number(o.amount).toFixed(0)}</p>
                  </div>
                  <p className="font-mono text-[10px] opacity-60 mb-1">{o.logged_by === null ? 'ONLINE' : 'WALK-IN'} · {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <p className="font-mono text-[10px] opacity-60 truncate mb-3">{o.email}</p>
                  <button onClick={() => setReceiptOrder(o)} className="w-full py-1.5 border border-green-300 text-green-700 font-mono text-[9px] uppercase hover:bg-green-100">View Bill</button>
                </div>
              ))}
              {orders.filter(o => o.status === 'completed').length === 0 && (
                <div className="text-center p-6 opacity-30 font-mono text-xs italic">No completed orders</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-1 gap-6 mt-10">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-2">Top loyalty cards</p>
          <div className="space-y-2 max-h-72 overflow-auto">
            {customers.length === 0 && (
              <p className="font-mono text-xs opacity-50 italic">no customers yet</p>
            )}
            {customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-ink/5 pb-2">
                <div>
                  <p className="font-display text-lg leading-none">{c.name}</p>
                  <p className="font-mono text-[10px] opacity-50">{c.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-accent leading-none">{c.stamps}/10</p>
                  <p className="font-mono text-[9px] opacity-50 mt-1">{c.last_stamp_date ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sketchbook Receipt Modal */}
      {receiptOrder && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper border border-ink/20 p-6 shadow-2xl max-w-sm w-full relative font-mono text-sm">
            {/* Notebook spiral ring aesthetic */}
            <div className="absolute top-0 inset-x-0 h-4 bg-ink/10 flex justify-around items-center px-4 rounded-t">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="size-2 rounded-full bg-paper border border-ink/20" />
              ))}
            </div>
            
            <button 
              onClick={() => setReceiptOrder(null)} 
              className="absolute top-6 right-6 text-ink/40 hover:text-ink font-mono text-xs uppercase"
            >
              [close]
            </button>
            
            <div className="mt-6 text-center">
              <p className="font-display text-2xl tracking-widest text-accent">afterhours</p>
              <p className="text-[10px] uppercase tracking-widest opacity-60">see you after hours.</p>
            </div>
            
            <div className="border-t border-dashed border-ink/20 my-4" />
            
            <div className="space-y-1 text-xs opacity-80">
              <p><strong>Receipt ID:</strong> {receiptOrder.id.slice(0, 8).toUpperCase()}</p>
              <p><strong>Date:</strong> {receiptOrder.order_date}</p>
              <p><strong>Customer:</strong> {receiptOrder.customer_name}</p>
              <p><strong>Email:</strong> {receiptOrder.email}</p>
            </div>
            
            <div className="border-t border-dashed border-ink/20 my-4" />
            
            <div className="space-y-2">
              {receiptOrder.items_json ? (
                (() => {
                  try {
                    const parsed = JSON.parse(receiptOrder.items_json);
                    return Array.isArray(parsed) ? parsed.map((item: OrderItem) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span>{item.name} x {item.quantity}</span>
                        <span>₹{(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    )) : null;
                  } catch (e) {
                    return null;
                  }
                })()
              ) : null}
              {(!receiptOrder.items_json || receiptOrder.items_json === "null") && (
                <div className="flex justify-between text-xs">
                  <span>Custom Order</span>
                  <span>₹{Number(receiptOrder.amount).toFixed(0)}</span>
                </div>
              )}
            </div>
            
            <div className="border-t border-dashed border-ink/20 my-4" />
            
            <div className="flex justify-between font-display text-xl">
              <span>TOTAL:</span>
              <span>₹{Number(receiptOrder.amount).toFixed(0)}</span>
            </div>
            
            {receiptOrder.stamp_awarded && (
              <div className="mt-4 border border-dashed border-accent p-2 text-center text-accent text-xs font-bold">
                ★ +1 LOYALTY STAMP AWARDED
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={() => handlePrint(receiptOrder)}
                className="w-full py-3 bg-accent text-paper font-display text-2xl hover:scale-105 transition-transform"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}