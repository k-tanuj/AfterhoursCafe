import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getAdminTables, createAdminTable, updateAdminTable, deleteAdminTable, getAdminBookings, type AdminBookingRow } from "@/lib/admin.functions";
import { SiteShell } from "@/components/SiteShell";
import { AdminGuard } from "@/components/AdminGuard";
import { Scribble } from "@/components/Doodles";

export const Route = createFileRoute("/admin/tables")({
  ssr: false,
  head: () => ({ meta: [{ title: "Table Inventory — AFTERHOURS Admin" }] }),
  component: () => <AdminGuard><TablesPage /></AdminGuard>,
});

type RTable = {
  id: string;
  table_no: string;
  capacity: number;
  location: string;
  is_active: boolean;
  notes: string | null;
};

const LOCATIONS = ["indoor", "window", "outdoor", "bar", "private"];

function TablesPage() {
  const [rows, setRows] = useState<RTable[]>([]);
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ table_no: "", capacity: 2, location: "indoor", notes: "" });
  const [busy, setBusy] = useState(false);

  const fetchTables = useServerFn(getAdminTables);
  const fetchBookings = useServerFn(getAdminBookings);
  const doCreate = useServerFn(createAdminTable);
  const doUpdate = useServerFn(updateAdminTable);
  const doDelete = useServerFn(deleteAdminTable);

  const load = async () => {
    try {
      const [data, bData] = await Promise.all([fetchTables(), fetchBookings()]);
      setRows(data);
      setBookings(bData);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.table_no.trim()) { toast.error("Table number required."); return; }
    if (form.capacity < 1) { toast.error("Capacity must be at least 1."); return; }
    setBusy(true);
    try {
      await doCreate({
        data: {
          table_no: form.table_no.trim(),
          capacity: form.capacity,
          location: form.location,
          notes: form.notes.trim() || null,
        }
      });
      toast.success(`Table ${form.table_no} added.`);
      setForm({ table_no: "", capacity: 2, location: "indoor", notes: "" });
      load();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (r: RTable) => {
    try {
      await doUpdate({
        data: {
          id: r.id,
          patch: { is_active: !r.is_active }
        }
      });
      load();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateField = async (r: RTable, patch: Partial<RTable>) => {
    try {
      await doUpdate({
        data: {
          id: r.id,
          patch
        }
      });
      load();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const remove = async (r: RTable) => {
    if (!confirm(`Remove table ${r.table_no}?`)) return;
    try {
      await doDelete({ data: { id: r.id } });
      toast.success("Removed.");
      load();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const totalCapacity = rows.filter((r) => r.is_active).reduce((s, r) => s + r.capacity, 0);

  return (
    <SiteShell hideFooter>
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">floor plan · inventory</p>
        <h1 className="font-display text-5xl md:text-6xl mt-2">Table Inventory.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />
        <p className="mt-3 font-serif italic text-ink/60">
          define every table with its seating capacity. bookings get auto-assigned to the smallest table that fits.
        </p>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total tables" value={rows.length} />
          <Stat label="Active" value={rows.filter(r => r.is_active).length} />
          <Stat label="Inactive" value={rows.filter(r => !r.is_active).length} />
          <Stat label="Seats (active)" value={totalCapacity} />
        </div>

        {(() => {
          const todayStr = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
          const todaysBookings = bookings.filter(b => b.booking_date === todayStr && b.table_no !== null && !["cancelled", "no_show"].includes(b.status));
          const occupiedTableNumbers = new Set(todaysBookings.map(b => b.table_no));

          const vacantTables = rows.filter(r => r.is_active && !occupiedTableNumbers.has(r.table_no));
          const occupiedTables = rows.filter(r => r.is_active && occupiedTableNumbers.has(r.table_no));

          return (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/70 border border-ink/10 p-6 shadow-sm">
                <h2 className="font-display text-2xl mb-4 text-emerald-700">Vacant Tables (Today)</h2>
                <div className="flex flex-wrap gap-2">
                  {vacantTables.length === 0 ? <p className="text-sm opacity-50 font-mono">None</p> : vacantTables.map(t => (
                    <span key={t.id} className="px-3 py-1 bg-emerald-100 text-emerald-900 font-mono text-sm border border-emerald-200">
                      {t.table_no} <span className="opacity-50 text-[10px] uppercase ml-1">cap:{t.capacity}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white/70 border border-ink/10 p-6 shadow-sm">
                <h2 className="font-display text-2xl mb-4 text-rose-700">Occupied / Reserved (Today)</h2>
                <div className="flex flex-wrap gap-2">
                  {occupiedTables.length === 0 ? <p className="text-sm opacity-50 font-mono">None</p> : occupiedTables.map(t => {
                    const booking = todaysBookings.find(b => b.table_no === t.table_no);
                    return (
                      <span key={t.id} className="px-3 py-1 bg-rose-100 text-rose-900 font-mono text-sm border border-rose-200" title={booking ? `${booking.guest_name} at ${booking.booking_time}` : ''}>
                        {t.table_no} <span className="opacity-50 text-[10px] uppercase ml-1">cap:{t.capacity}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="mt-10 bg-white/70 border border-ink/10 p-6">
          <h2 className="font-display text-2xl">Add a table</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <Field label="table no.">
              <input
                value={form.table_no}
                onChange={(e) => setForm({ ...form, table_no: e.target.value })}
                placeholder="T7"
                className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-base pb-1"
              />
            </Field>
            <Field label="capacity">
              <input
                type="number" min={1} max={30}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-base pb-1"
              />
            </Field>
            <Field label="location">
              <select
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-base pb-1"
              >
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="notes">
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="near power outlet"
                className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-base pb-1"
              />
            </Field>
            <button
              onClick={add}
              disabled={busy}
              className="px-5 py-2 bg-ink text-paper font-display text-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {busy ? "adding…" : "+ add table"}
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white/60 border border-ink/10 overflow-hidden">
          <table className="w-full font-mono text-sm">
            <thead className="bg-ink/5 text-[10px] uppercase tracking-widest">
              <tr className="text-left">
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3 text-center">Capacity</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-6 text-center opacity-50 italic">loading…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center opacity-50 italic">no tables yet — add one above.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ink/5 hover:bg-accent/5">
                  <td className="px-4 py-3 font-display text-lg">{r.table_no}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number" min={1} max={30}
                      defaultValue={r.capacity}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== r.capacity && v >= 1) updateField(r, { capacity: v });
                      }}
                      className="w-16 text-center bg-transparent border-b border-ink/20 focus:border-accent outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.location}
                      onChange={(e) => updateField(r, { location: e.target.value })}
                      className="bg-transparent border-b border-ink/20 focus:border-accent outline-none"
                    >
                      {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 opacity-70">
                    <input
                      defaultValue={r.notes ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (v !== (r.notes ?? null)) updateField(r, { notes: v });
                      }}
                      className="w-full bg-transparent border-b border-transparent focus:border-accent outline-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(r)}
                      className={`px-2 py-0.5 text-[10px] uppercase tracking-widest rounded ${r.is_active ? "bg-accent/20 text-accent" : "bg-ink/10 text-ink/50"}`}
                    >
                      {r.is_active ? "active" : "off"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(r)} className="text-[10px] uppercase tracking-widest opacity-50 hover:text-red-600 hover:opacity-100">
                      remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SiteShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/70 border border-ink/10 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">{label}</p>
      <p className="font-display text-4xl mt-1 text-ink">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">{label}</p>
      {children}
    </div>
  );
}