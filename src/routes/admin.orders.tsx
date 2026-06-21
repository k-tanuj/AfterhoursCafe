import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Scribble } from "@/components/Doodles";
import { AdminOrders } from "@/components/AdminOrders";
import { useIsAdmin } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/orders")({
  ssr: false,
  head: () => ({ meta: [{ title: "Orders — AFTERHOURS Admin" }] }),
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return <SiteShell><div className="max-w-6xl mx-auto px-6 pt-20 font-mono text-xs uppercase opacity-50">loading…</div></SiteShell>;
  if (!isAdmin) return <SiteShell><div className="max-w-6xl mx-auto px-6 pt-20 font-display text-4xl">staff only.</div></SiteShell>;
  return (
    <SiteShell hideFooter>
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">orders & loyalty</p>
        <h1 className="font-display text-5xl md:text-6xl mt-2">Orders.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />
        <div className="mt-10">
          <AdminOrders />
        </div>
      </section>
    </SiteShell>
  );
}