import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats, claimAdminIfNone } from "@/lib/admin.functions";
import { SiteShell } from "@/components/SiteShell";
import { Scribble } from "@/components/Doodles";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — AFTERHOURS" },
      { name: "description", content: "Back-of-house dashboard for AFTERHOURS staff." },
      { property: "og:title", content: "Admin — AFTERHOURS" },
      { property: "og:description", content: "Back-of-house dashboard for AFTERHOURS staff." },
    ],
  }),
  component: AdminPage,
});

const CARDS: {
  to: "/admin/orders" | "/admin/customers" | "/admin/bookings" | "/admin/tables" | "/admin/menu" | "/admin/demand" | "/admin/feedback" | "/admin/wall" | "/admin/analytics";
  label: string;
  desc: string;
}[] = [
  { to: "/admin/orders", label: "Orders", desc: "log walk-ins, award loyalty stamps." },
  { to: "/admin/analytics", label: "Analytics", desc: "total sales, profit, and monthly stats." },
  { to: "/admin/customers", label: "Customers", desc: "everyone who showed up." },
  { to: "/admin/bookings", label: "Bookings", desc: "tables booked — today and ahead." },
  { to: "/admin/tables", label: "Table Inventory", desc: "add tables, set capacities, toggle on/off." },
  { to: "/admin/menu", label: "Menu", desc: "add, edit, hide or remove drinks." },
  { to: "/admin/demand", label: "Demand Forecast", desc: "ml prediction for next week." },
  { to: "/admin/feedback", label: "Feedback", desc: "what customers said." },
  { to: "/admin/wall", label: "Wall", desc: "moderate notes & polaroids." },
];

function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();
  const { user } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [counts, setCounts] = useState({ bookingsToday: 0, openMenu: 0, customers: 0, ordersToday: 0 });

  const fetchStats = useServerFn(getAdminStats);
  const doClaimAdmin = useServerFn(claimAdminIfNone);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const stats = await fetchStats();
        setCounts(stats);
      } catch (e: any) {
        toast.error(e.message);
      }
    })();
  }, [isAdmin]);

  const claimAdmin = async () => {
    setClaiming(true);
    try {
      const res = await doClaimAdmin();
      if (res.success) {
        toast.success("admin access granted. reloading…");
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.error(res.message || "admin already claimed.");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <SiteShell>
        <section className="max-w-6xl mx-auto px-4 md:px-8 pt-32 pb-32 font-mono text-xs uppercase opacity-50">
          checking credentials…
        </section>
      </SiteShell>
    );
  }
  if (!isAdmin) {
    return (
      <SiteShell>
        <section className="max-w-3xl mx-auto px-4 md:px-8 pt-24 pb-32 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">staff-only · back room</p>
          <h1 className="font-display text-6xl md:text-7xl mt-3">Not your table.</h1>
          <Scribble className="w-40 text-accent/60 mt-3 mx-auto" />
          <p className="mt-8 font-serif italic text-xl text-ink/70">
            this corner of the sketchbook is for staff. nothing to see here — your seat is out front.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            {!user && (
              <Link to="/auth" className="inline-block px-8 py-4 bg-accent text-paper font-display text-2xl hover:scale-105 transition-transform">
                login as admin →
              </Link>
            )}
            {user && (
              <button
                onClick={claimAdmin}
                disabled={claiming}
                className="inline-block px-8 py-4 bg-accent text-paper font-display text-2xl hover:scale-105 transition-transform disabled:opacity-50"
              >
                {claiming ? "claiming…" : "claim admin access →"}
              </button>
            )}
            <Link to="/" className="inline-block px-8 py-4 bg-ink text-paper font-display text-2xl hover:scale-105 transition-transform">
              back to the café
            </Link>
          </div>
          {user && (
            <p className="mt-6 font-mono text-[10px] uppercase tracking-widest opacity-50">
              signed in as {user.email} · only works if no admin exists yet
            </p>
          )}
        </section>
      </SiteShell>
    );
  }

  const STATS = [
    { label: "Today's Bookings", value: counts.bookingsToday },
    { label: "Orders Today", value: counts.ordersToday },
    { label: "Menu (live)", value: counts.openMenu },
    { label: "Total Customers", value: counts.customers },
  ];

  return (
    <SiteShell hideFooter>
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">back office · staff only</p>
        <h1 className="font-display text-5xl md:text-6xl mt-2">Dashboard.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />
        <p className="mt-3 font-serif italic text-ink/60">
          welcome back, {user?.email}. everything you need to run the café tonight.
        </p>

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/70 border border-ink/10 p-5 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">{s.label}</p>
              <p className="font-display text-5xl mt-2 text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-14 font-display text-3xl">Jump to…</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group bg-white/70 border border-ink/10 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <h3 className="font-display text-2xl group-hover:text-accent">{c.label} →</h3>
              <p className="mt-2 font-serif italic text-ink/70 text-sm">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
