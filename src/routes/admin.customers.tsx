import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react';
import { useServerFn } from "@tanstack/react-start";
import { getAdminCustomers, createAdminCustomer } from "@/lib/admin.functions";
import { SiteShell } from "@/components/SiteShell";
import { AdminGuard } from "@/components/AdminGuard";
import { Scribble } from "@/components/Doodles";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customers")({
  ssr: false,
  head: () => ({ meta: [{ title: "Customers — AFTERHOURS Admin" }] }),
  component: () => <AdminGuard><CustomersPage /></AdminGuard>,
});

type Customer = {
  id: string;
  name: string | null;
  email: string;
  stamps: number;
  last_stamp_date: string | null;
  created_at: string;
};

function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchCustomers = useServerFn(getAdminCustomers);
  const addCustomerFn = useServerFn(createAdminCustomer);

  const loadData = async () => {
    try {
      const data = await fetchCustomers();
      setRows(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setAdding(true);
    try {
      await addCustomerFn({ data: { name: newName, email: newEmail } });
      toast.success("Customer added successfully.");
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const filtered = rows.filter(
    (r) => q === "" || (r.name ?? "").toLowerCase().includes(q.toLowerCase()) || r.email.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <SiteShell hideFooter>
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">people who came back</p>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display text-5xl md:text-6xl mt-2">Customers.</h1>
            <Scribble className="w-40 text-accent/60 mt-2" />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-paper font-display text-xl px-6 py-2 hover:scale-105 transition-transform"
          >
            + Add Customer
          </button>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search name or email"
            className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm w-80 focus:outline-none focus:border-accent"
          />
          <span className="font-mono text-[10px] uppercase opacity-50">{filtered.length} of {rows.length}</span>
        </div>

        <div className="mt-6 bg-white/60 border border-ink/10 overflow-hidden">
          <table className="w-full font-mono text-sm">
            <thead className="bg-ink/5 text-[10px] uppercase tracking-widest">
              <tr className="text-left">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Stamps</th>
                <th className="px-4 py-3">Last stamp</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={5} className="px-4 py-6 text-center opacity-50 italic">loading…</td></tr>)}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center opacity-50 italic">no customers match.</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-ink/5 hover:bg-accent/5">
                  <td className="px-4 py-3">{c.name ?? <span className="opacity-40">—</span>}</td>
                  <td className="px-4 py-3 opacity-70">{c.email}</td>
                  <td className="px-4 py-3 text-center"><span className="text-accent font-display text-lg">{c.stamps}/10</span></td>
                  <td className="px-4 py-3 opacity-70">{c.last_stamp_date ?? <span className="opacity-40">—</span>}</td>
                  <td className="px-4 py-3 opacity-70">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-paper w-full max-w-md border border-ink/10 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-3xl">New Customer</h2>
              <button onClick={() => setShowAddModal(false)} className="text-ink/50 hover:text-ink font-mono text-sm">
                [close]
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Full Name</span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Email Address</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  required
                  className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
                />
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full bg-accent text-paper font-display text-xl py-3 hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {adding ? "saving..." : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SiteShell>
  );
}