import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react';
import { useServerFn } from "@tanstack/react-start";
import { getAdminFeedback } from "@/lib/admin.functions";
import { SiteShell } from "@/components/SiteShell";
import { AdminGuard } from "@/components/AdminGuard";
import { Scribble, Star } from "@/components/Doodles";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/feedback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Feedback — AFTERHOURS Admin" }] }),
  component: () => <AdminGuard><FeedbackPage /></AdminGuard>,
});

type Feedback = {
  id: string;
  user_id: string | null;
  rating: number;
  message: string | null;
  created_at: string;
};

function FeedbackPage() {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchFeedback = useServerFn(getAdminFeedback);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchFeedback();
        setRows(data);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "—";

  return (
    <SiteShell hideFooter>
      <section className="max-w-4xl mx-auto px-4 md:px-8 pt-12 pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">what they said</p>
        <h1 className="font-display text-5xl md:text-6xl mt-2">Feedback.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />

        <div className="mt-6 flex gap-8 font-mono text-xs uppercase">
          <div><span className="opacity-50">avg rating: </span><span className="text-accent font-display text-2xl">{avg}</span></div>
          <div><span className="opacity-50">total: </span><span className="text-accent font-display text-2xl">{rows.length}</span></div>
        </div>

        <div className="mt-8 space-y-4">
          {loading && <p className="font-mono text-xs opacity-50">loading…</p>}
          {!loading && rows.length === 0 && <p className="font-serif italic opacity-50">no feedback yet.</p>}
          {rows.map((f) => (
            <div key={f.id} className="bg-white/60 border border-ink/10 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-accent">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`size-4 ${i < f.rating ? "" : "opacity-20"}`} />
                  ))}
                </div>
                <span className="font-mono text-[10px] uppercase opacity-50">{new Date(f.created_at).toLocaleString()}</span>
              </div>
              {f.message && <p className="mt-3 font-serif italic text-ink/80">"{f.message}"</p>}
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}