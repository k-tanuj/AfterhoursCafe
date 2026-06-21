import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { SiteShell } from "@/components/SiteShell";
import { Scribble } from "@/components/Doodles";
import { useIsAdmin } from "@/hooks/use-auth";
import { getLatestForecast, secureRetrainDemand } from "@/lib/demand.functions";
import type { DayPrediction, ForecastRow } from "@/lib/demand.types";

export const Route = createFileRoute("/admin/demand")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Demand Forecast — AFTERHOURS" },
      {
        name: "description",
        content: "Weekly ML-powered booking demand forecast for staff planning.",
      },
    ],
  }),
  component: DemandPage,
});

const HOUR_LABEL = (h: number) => {
  const ampm = h >= 12 && h < 24 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${ampm}`;
};

function tagColor(tag: DayPrediction["tag"]) {
  if (tag === "busy") return "bg-accent text-paper";
  if (tag === "quiet") return "bg-ink/10 text-ink/60";
  return "bg-ink text-paper";
}

function fmtTs(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DemandPage() {
  const { isAdmin, loading } = useIsAdmin();
  const fetchLatest = useServerFn(getLatestForecast);
  const runRetrain = useServerFn(secureRetrainDemand);
  const qc = useQueryClient();

  const [showRetrainModal, setShowRetrainModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const query = useQuery({
    queryKey: ["demand-forecast"],
    queryFn: () => fetchLatest(),
    enabled: !!isAdmin,
  });

  const retrain = useMutation({
    mutationFn: () => runRetrain({ data: { email: adminEmail, password: adminPassword } }),
    onSuccess: () => {
      toast.success("model retrained.");
      setShowRetrainModal(false);
      setAdminEmail("");
      setAdminPassword("");
      qc.invalidateQueries({ queryKey: ["demand-forecast"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "retrain failed"),
  });

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
          <h1 className="font-display text-6xl">Staff only.</h1>
          <p className="mt-6 italic text-ink/70">this page is for the back room.</p>
          <Link to="/" className="inline-block mt-8 px-8 py-4 bg-ink text-paper font-display text-2xl">
            back home
          </Link>
        </section>
      </SiteShell>
    );
  }

  const f: ForecastRow | null | undefined = query.data;

  return (
    <SiteShell>
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-16 pb-20">
        <Link
          to="/admin"
          className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60 hover:opacity-100 hover:text-accent"
        >
          ← back to dashboard
        </Link>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">
          Section 008 · ML · weekly demand
        </p>
        <h1 className="font-display text-6xl md:text-7xl mt-3 -rotate-[2deg]">
          Demand Forecast.
        </h1>
        <Scribble className="w-48 text-accent/60 mt-3" />
        <p className="mt-6 italic text-ink/75 max-w-2xl text-lg leading-relaxed">
          a simple weekly-retrained model that learns from past bookings and predicts
          next week's traffic, hour by hour. plan staffing, prep, and promos from
          monday morning instead of guessing.
        </p>

        {/* Header card */}
        <div className="mt-8 bg-white/70 border border-ink/10 p-6 shadow-sm flex flex-wrap items-end gap-6 justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">last trained</p>
            <p className="font-display text-3xl">
              {f ? fmtTs(f.trained_at) : "—"}
            </p>
            <p className="font-mono text-[11px] opacity-60">
              {f
                ? `${f.sample_size} past bookings analyzed · Data from ${f.training_window_start ?? "—"} to ${f.training_window_end ?? "—"}`
                : "no model yet — click retrain to train the first one."}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">Forecast Accuracy</p>
            <p className="font-display text-3xl text-accent">
              {f?.mae != null ? `± ${f.mae} bookings/hr` : "—"}
            </p>
            <p className="font-mono text-[11px] opacity-60">On average, predictions are off by this much per hour</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">next auto-retrain</p>
            <p className="font-display text-3xl">Mon · 3:00 am</p>
            <p className="font-mono text-[11px] opacity-60">runs every monday automatically</p>
          </div>
          <button
            onClick={() => setShowRetrainModal(true)}
            className="px-6 py-3 bg-ink text-paper font-display text-2xl hover:scale-105 transition-transform disabled:opacity-50"
          >
            retrain now →
          </button>
        </div>

        {/* Retrain Modal */}
        {showRetrainModal && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-paper border border-ink/20 p-6 shadow-2xl max-w-sm w-full font-mono text-sm relative">
              <button 
                onClick={() => setShowRetrainModal(false)}
                className="absolute top-4 right-4 text-ink/40 hover:text-ink text-xs uppercase"
              >
                [close]
              </button>
              <h3 className="font-display text-3xl mb-2 text-accent">Admin Authorization</h3>
              <p className="opacity-70 mb-4 text-[10px] uppercase tracking-widest">Please verify your credentials to start retraining.</p>
              
              <div className="space-y-3">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Admin Email</span>
                  <input 
                    type="email" 
                    value={adminEmail} 
                    onChange={e => setAdminEmail(e.target.value)}
                    className="w-full bg-white/60 border border-ink/15 px-3 py-2 focus:border-accent focus:outline-none"
                    placeholder="admin@example.com"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Password</span>
                  <input 
                    type="password" 
                    value={adminPassword} 
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full bg-white/60 border border-ink/15 px-3 py-2 focus:border-accent focus:outline-none"
                    placeholder="••••••••"
                  />
                </label>
                <button
                  onClick={() => retrain.mutate()}
                  disabled={retrain.isPending || !adminEmail || !adminPassword}
                  className="w-full mt-2 bg-accent text-paper py-3 font-display text-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {retrain.isPending ? "Verifying & Training..." : "Confirm & Retrain"}
                </button>
              </div>
            </div>
          </div>
        )}

        {query.isLoading && (
          <p className="mt-10 font-mono text-xs opacity-60">loading forecast…</p>
        )}
        {query.isError && (
          <p className="mt-10 font-mono text-xs text-red-600">
            couldn't load forecast: {(query.error as any)?.message}
          </p>
        )}

        {!query.isLoading && !f && (
          <div className="mt-10 bg-ink/5 border border-dashed border-ink/20 p-10 text-center">
            <p className="font-display text-3xl">no forecast yet.</p>
            <p className="mt-2 font-mono text-xs opacity-60">
              hit "retrain now" to generate the first one.
            </p>
          </div>
        )}

        {f && <ForecastBody forecast={f} />}

        <Explainer />
      </section>
    </SiteShell>
  );
}

function ForecastBody({ forecast }: { forecast: ForecastRow }) {
  const p = forecast.predictions;
  const days = p.days;

  return (
    <>
      {p.cold_start && (
        <div className="mt-8 bg-yellow-100 border border-yellow-300 text-yellow-900 p-4 font-mono text-xs">
          ⚠ Needs More Data — not enough booking history yet. These numbers are just rough guesses, not learned from your data. They will get more accurate as more bookings come in.
        </div>
      )}

      {/* 7-day at-a-glance */}
      <h2 className="font-display text-4xl mt-12 -rotate-[1deg]">
        next 7 days · {p.generated_for.week_start} → {p.generated_for.week_end}
      </h2>
      <p className="font-mono text-[11px] opacity-60 mb-4 mt-2">
        Quick summary for the week: "Bookings" = reserved tables, "Covers" = total expected guests. Use the red "Busy" tags to know when to schedule extra staff.
      </p>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((d) => (
          <div key={d.date} className="bg-white/70 border border-ink/10 p-4 shadow-sm">
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">
              {d.dow_label} · {d.date.slice(5)}
            </p>
            <p className="font-display text-4xl mt-1">{d.predicted_bookings}</p>
            <p className="font-mono text-[10px] opacity-60">bookings</p>
            <p className="mt-2 font-display text-xl">{d.predicted_covers}</p>
            <p className="font-mono text-[10px] opacity-60">covers</p>
            <span className={`inline-block mt-3 px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${tagColor(d.tag)}`}>
              {d.tag}
            </span>
          </div>
        ))}
      </div>

      {/* Daily bar chart with low/high */}
      <div className="mt-12 bg-white/70 border border-ink/10 p-6 shadow-sm">
        <h3 className="font-display text-3xl mb-1">daily forecast.</h3>
        <p className="font-mono text-[11px] opacity-60 mb-4">
          Visual check of expected traffic. Bars = Exact predicted bookings. Lines = Expected safe range (plan prep for the top of the line just in case).
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={days.map((d) => ({
                day: d.dow_label,
                value: d.predicted_bookings,
                err: [d.predicted_bookings - d.low, d.high - d.predicted_bookings],
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#e63946" radius={[4, 4, 0, 0]}>
                <ErrorBar dataKey="err" width={6} strokeWidth={2} stroke="#1d1d1d" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap day x hour */}
      <div className="mt-8 bg-white/70 border border-ink/10 p-6 shadow-sm overflow-x-auto">
        <h3 className="font-display text-3xl mb-1">rush windows.</h3>
        <p className="font-mono text-[11px] opacity-60 mb-4">
          Your hour-by-hour pacing guide. Darker red squares = busier hours. Make sure prep work is done and avoid staff breaks during these times.
        </p>
        <Heatmap days={days} />
      </div>

      {/* Party + mood */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MixCard
          title="party size mix."
          subtitle="Are we getting couples or big groups? Use this to arrange tables before doors open."
          data={[
            { label: "1 (solo)", value: p.totals.party_mix.p1 },
            { label: "2", value: p.totals.party_mix.p2 },
            { label: "3–4", value: p.totals.party_mix.p34 },
            { label: "5+", value: p.totals.party_mix.p5 },
          ]}
        />
        <MixCard
          title="mood mix."
          subtitle="Predicted vibe (chill, date, study). Use this to choose the Spotify playlist and adjust lighting."
          data={Object.entries(p.totals.mood_mix).map(([label, value]) => ({ label, value }))}
        />
      </div>
    </>
  );
}

function Heatmap({ days }: { days: DayPrediction[] }) {
  const hours = days[0]?.by_hour.map((h) => h.hour) ?? [];
  const max =
    days.reduce((m, d) => Math.max(m, ...d.by_hour.map((h) => h.value)), 0) || 1;
  return (
    <table className="text-xs font-mono">
      <thead>
        <tr>
          <th className="text-left pr-3 opacity-50">day</th>
          {hours.map((h) => (
            <th key={h} className="px-1 opacity-50 text-center w-12">{HOUR_LABEL(h)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {days.map((d) => (
          <tr key={d.date}>
            <td className="pr-3 py-1 font-display text-base">{d.dow_label}</td>
            {d.by_hour.map((cell) => {
              const intensity = cell.value / max;
              const bg = `rgba(230, 57, 70, ${0.08 + intensity * 0.85})`;
              return (
                <td
                  key={cell.hour}
                  className="text-center align-middle"
                  style={{ background: bg, color: intensity > 0.55 ? "#fff" : "#1d1d1d" }}
                  title={`${d.dow_label} ${HOUR_LABEL(cell.hour)} — ${cell.value} bookings`}
                >
                  {cell.value > 0 ? cell.value.toFixed(1) : ""}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MixCard({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: { label: string; value: number }[];
}) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const palette = ["#e63946", "#1d1d1d", "#f4a261", "#457b9d", "#2a9d8f"];
  return (
    <div className="bg-white/70 border border-ink/10 p-6 shadow-sm">
      <h3 className="font-display text-3xl">{title}</h3>
      <p className="font-mono text-[11px] opacity-60 mb-4">{subtitle}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
            <Tooltip
              formatter={(v: number) => [`${v} (${Math.round((v / total) * 100)}%)`, "share"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Explainer() {
  return (
    <div className="mt-12 bg-ink text-paper p-8 shadow-xl">
      <h2 className="font-display text-4xl -rotate-[1deg]">how this works.</h2>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm leading-relaxed">
        <div>
          <p className="text-accent uppercase text-[10px] tracking-widest mb-2">data</p>
          <p className="opacity-90">
            last 8 weeks of confirmed bookings. each row has a date, a time, a party
            size and a mood. no personal info leaves this page.
          </p>
        </div>
        <div>
          <p className="text-accent uppercase text-[10px] tracking-widest mb-2">model</p>
          <p className="opacity-90">
            The system looks at past bookings for each hour of each day, giving extra weight to the last 2 weeks to catch recent trends. It's simple, reliable, and uses your real data.
          </p>
        </div>
        <div>
          <p className="text-accent uppercase text-[10px] tracking-widest mb-2">accuracy</p>
          <p className="opacity-90">
            To test itself, the system predicts the most recent week and compares it to what actually happened. The difference is the "Accuracy" score shown above—the lower the number, the better the prediction.
          </p>
        </div>
        <div>
          <p className="text-accent uppercase text-[10px] tracking-widest mb-2">retrain</p>
          <p className="opacity-90">
            automatic every monday at 3am. you can also force a retrain anytime
            from the button above (e.g. after a big weekend or a viral post).
          </p>
        </div>
        <div>
          <p className="text-accent uppercase text-[10px] tracking-widest mb-2">Needs More Data</p>
          <p className="opacity-90">
            If there are fewer than 14 past bookings, the system doesn't have enough data to learn yet. It will just show a rough guess until more bookings come in.
          </p>
        </div>
        <div>
          <p className="text-accent uppercase text-[10px] tracking-widest mb-2">how to use it</p>
          <p className="opacity-90">
            staff the busy days harder. pre-prep for the rush windows in the
            heatmap. set table layouts from the party-size mix. tune playlist +
            lighting from the mood mix.
          </p>
        </div>
      </div>
    </div>
  );
}