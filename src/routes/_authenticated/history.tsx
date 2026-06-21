import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell } from "@/components/SiteShell";
import { Scribble, Star } from "@/components/Doodles";
import { Svg } from "@/lib/svgs";
import { toast } from "sonner";
import { getMyBookings, cancelBooking, type MyBookingRow } from "@/lib/bookings.functions";
import { getFeedbackForUser } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Your History — AFTERHOURS" }] }),
  component: HistoryPage,
});

type FeedbackRow = {
  id: string;
  rating: number;
  message: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-accent/15 text-accent border-accent/30",
  pending: "bg-ink/10 text-ink border-ink/20",
  seated: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelled: "bg-stone-200 text-stone-500 border-stone-300 line-through",
  no_show: "bg-red-100 text-red-700 border-red-300",
};

function HistoryPage() {
  const queryClient = useQueryClient();
  const fetchBookings = useServerFn(getMyBookings);
  const fetchFeedback = useServerFn(getFeedbackForUser);
  const doCancel = useServerFn(cancelBooking);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: bookings = [], isLoading } = useQuery<MyBookingRow[]>({
    queryKey: ["my-bookings"],
    queryFn: () => fetchBookings(),
    staleTime: 15_000,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchFeedback();
        setFeedback(data ?? []);
      } catch (e: any) {
        toast.error(e.message || "Failed to load feedback.");
      } finally {
        setFeedbackLoading(false);
      }
    })();
  }, []);

  const cancel = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    setCancellingId(id);
    try {
      await doCancel({ data: { id } });
      toast.success("Booking cancelled.");
      await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't cancel.");
    } finally {
      setCancellingId(null);
    }
  };

  const loading = isLoading || feedbackLoading;

  return (
    <SiteShell>
      <section className="max-w-4xl mx-auto px-4 md:px-8 pt-16 pb-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">Section 009 · the diary</p>
        <h1 className="font-display text-6xl md:text-7xl mt-3">your history.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />

        {loading ? (
          <p className="mt-12 font-display text-2xl opacity-50">flipping through pages…</p>
        ) : (
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="font-display text-4xl flex items-center gap-3"><Svg name="couch" className="size-8" /> bookings</h2>
              {bookings.length === 0 ? (
                <p className="mt-4 italic font-serif text-ink/60">no bookings yet — see you after hours.</p>
              ) : (
                <ul className="mt-6 space-y-4">
                  {bookings.map((b) => (
                    <li key={b.id} className="bg-white/60 border border-ink/10 p-5 shadow-md font-mono text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-xl">{b.booking_date || "tonight"} · {b.booking_time}</p>
                          <p className="opacity-70 mt-1">party of {b.party}{b.table_no ? ` · table ${b.table_no}` : ""}{b.mood ? ` · ${b.mood}` : ""}</p>
                          {b.reference_code && (
                            <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">ref · {b.reference_code}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-[10px] uppercase tracking-widest border rounded ${STATUS_STYLE[b.status] ?? "bg-ink/10 border-ink/20"}`}>
                          {b.status.replace("_", " ")}
                        </span>
                      </div>
                      {b.requests && <p className="opacity-60 italic mt-2">"{b.requests}"</p>}
                      {(b.status === "pending" || b.status === "confirmed") && (
                        <button
                          onClick={() => cancel(b.id)}
                          disabled={cancellingId === b.id}
                          className="mt-3 text-[10px] uppercase tracking-widest text-accent hover:underline disabled:opacity-50"
                        >
                          {cancellingId === b.id ? "cancelling…" : "cancel this booking"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="font-display text-4xl flex items-center gap-3"><Svg name="message" className="size-8" /> feedback</h2>
              {feedback.length === 0 ? (
                <p className="mt-4 italic font-serif text-ink/60">nothing left in the suggestion box yet.</p>
              ) : (
                <ul className="mt-6 space-y-4">
                  {feedback.map((f) => (
                    <li key={f.id} className="bg-white/60 border border-ink/10 p-5 shadow-md">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(n => <Star key={n} className={`size-4 ${n<=f.rating?"text-accent fill-current":"text-ink/20"}`} />)}
                      </div>
                      {f.message && <p className="font-serif italic text-ink/80 mt-2">"{f.message}"</p>}
                      <p className="font-mono text-[10px] uppercase opacity-50 mt-2">{new Date(f.created_at).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </SiteShell>
  );
}