import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteShell } from "@/components/SiteShell";
import { AdminGuard } from "@/components/AdminGuard";
import { Scribble } from "@/components/Doodles";
import { updateBookingStatus } from "@/lib/bookings.functions";
import { getAdminBookings, AdminBookingRow } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/bookings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Bookings — AFTERHOURS Admin" }] }),
  component: () => <AdminGuard><BookingsPage /></AdminGuard>,
});

type StatusValue = "pending" | "confirmed" | "seated" | "cancelled" | "no_show";
const STATUSES: StatusValue[] = ["pending", "confirmed", "seated", "cancelled", "no_show"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-200/50 text-yellow-900",
  confirmed: "bg-emerald-200/50 text-emerald-900",
  seated: "bg-blue-200/50 text-blue-900",
  cancelled: "bg-ink/10 text-ink/50 line-through",
  no_show: "bg-red-200/50 text-red-900",
};

function BookingsPage() {
  const [rows, setRows] = useState<AdminBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "today" | "past" | "all">("upcoming");
  
  const fetchBookings = useServerFn(getAdminBookings);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchBookings();
      setRows(data ?? []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "today") return r.booking_date === today;
    if (filter === "upcoming") return r.booking_date >= today;
    return r.booking_date < today;
  });

  return (
    <SiteShell hideFooter>
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">tables booked</p>
        <h1 className="font-display text-5xl md:text-6xl mt-2">Bookings.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />

        <div className="mt-8 flex flex-wrap gap-2">
          {(["upcoming", "today", "past", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1 border border-ink/20 rounded-full font-mono text-xs uppercase ${filter === f ? "bg-ink text-paper" : "hover:bg-ink hover:text-paper"}`}>
              {f}
            </button>
          ))}
          <span className="ml-auto font-mono text-[10px] uppercase opacity-50 self-center">{filtered.length} shown</span>
        </div>

        <div className="mt-6 bg-white/60 border border-ink/10 overflow-x-auto">
          <table className="w-full font-mono text-sm min-w-[1100px]">
            <thead className="bg-ink/5 text-[10px] uppercase tracking-widest">
              <tr className="text-left">
                <th className="px-3 py-3">Ref</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Guest</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3 text-center">Party</th>
                <th className="px-3 py-3">Table</th>
                <th className="px-3 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-6 text-center opacity-50 italic">loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center opacity-50 italic">no bookings here.</td></tr>
              )}
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-ink/5 hover:bg-accent/5">
                  <td className="px-3 py-3 font-display text-base">{b.reference_code ?? <span className="opacity-40">—</span>}</td>
                  <td className="px-3 py-3">{b.booking_date}</td>
                  <td className="px-3 py-3">{b.booking_time}</td>
                  <td className="px-3 py-3">
                    <div>{b.guest_name ?? <span className="opacity-40">—</span>}</div>
                    {b.occasion && <div className="text-[10px] uppercase tracking-widest text-accent">{b.occasion}</div>}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {b.guest_phone && <div>{b.guest_phone}</div>}
                    {b.guest_email && <div className="opacity-60">{b.guest_email}</div>}
                    {!b.guest_phone && !b.guest_email && <span className="opacity-40">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">{b.party}</td>
                  <td className="px-3 py-3">
                    {b.table_no
                      ? <span className="font-display">{b.table_no}</span>
                      : <span className="opacity-40">—</span>}
                  </td>
                  <td className="px-3 py-3 opacity-70 max-w-[180px] truncate" title={b.requests ?? ""}>
                    {b.seating_preference && <div className="text-[10px] uppercase tracking-widest opacity-60">{b.seating_preference}</div>}
                    {b.requests ?? (b.seating_preference ? "" : <span className="opacity-40">—</span>)}
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