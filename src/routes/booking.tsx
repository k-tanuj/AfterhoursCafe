import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { SiteShell } from "@/components/SiteShell";
import { Star, Scribble, CoffeeCup } from "@/components/Doodles";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";
import { createBooking, getAvailability, type CreateBookingResult, type AvailableTable } from "@/lib/bookings.functions";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Book a Slot — AFTERHOURS" },
      { name: "description", content: "Reserve a corner desk before the kettle goes off." },
      { property: "og:title", content: "Book a Slot — AFTERHOURS" },
      { property: "og:description", content: "Reserve a corner desk before the kettle goes off." },
    ],
  }),
  component: BookingPage,
});

// Open 12 pm → 3 am (next day). 1-hour slots.
const TIMES: string[] = (() => {
  const out: string[] = [];
  // 12pm..11pm
  for (let h = 12; h <= 23; h++) {
    const hh = h === 12 ? 12 : h - 12;
    out.push(`${hh}:00 pm`);
  }
  // 12am..3am
  out.push("12:00 am");
  for (let h = 1; h <= 3; h++) out.push(`${h}:00 am`);
  return out;
})();
const MOODS = ["Sleepy", "Studying", "Date", "Hanging Out", "Creative"];
const OCCASIONS = ["None", "Birthday", "Anniversary", "Date Night", "Casual Meet"];
const SEATING = ["No Preference", "Indoor", "Window", "Outdoor"];

const contactSchema = z.object({
  guest_name: z.string().trim().min(2, "Name is too short").max(80),
  guest_phone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone"),
  guest_email: z.string().trim().email("Enter a valid email").max(200),
});

function BookingPage() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    date: "",
    party: 2,
    time: "",
    table_id: "",
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    occasion: "None",
    seating_preference: "No Preference",
    requests: "",
    mood: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<CreateBookingResult | null>(null);
  const sectionRef = useScrollReveal<HTMLElement>({ stagger: 0.1, y: 30 });
  const submit = useServerFn(createBooking);
  const fetchAvail = useServerFn(getAvailability);

  useEffect(() => {
    if (user) {
      setData((prev) => ({
        ...prev,
        guest_email: prev.guest_email || user.email || "",
        guest_name: prev.guest_name || user.displayName || "",
      }));
    }
  }, [user]);

  const { data: avail } = useQuery({
    queryKey: ["availability", data.date, data.party],
    queryFn: () => fetchAvail({ data: { booking_date: data.date, party: data.party } }),
    enabled: !!data.date && data.party >= 1,
    staleTime: 15_000,
  });
  const availableTables = (time: string): AvailableTable[] => {
    if (!avail || !avail.any_fitting_tables) return [];
    const s = avail.slots as Record<string, AvailableTable[]>;
    if (Object.prototype.hasOwnProperty.call(s, time)) return s[time];
    return (avail as any).all_fitting_tables || [];
  };

  const TOTAL_STEPS = 7;
  const stepLabels = ["date", "party", "time", "table", "contact", "mood", "review"];

  const validStep = (() => {
    if (step === 1) return !!data.date && data.date >= new Date().toISOString().slice(0, 10);
    if (step === 2) return data.party >= 1 && data.party <= 20;
    if (step === 3) return !!data.time && availableTables(data.time).length > 0;
    if (step === 4) return true; // optional table selection
    if (step === 5) return contactSchema.safeParse(data).success;
    return true;
  })();

  const next = () => {
    if (!validStep) {
      if (step === 1) toast.error("Pick a date (today or later).");
      else if (step === 3) toast.error("Pick a time slot.");
      else if (step === 5) {
        const r = contactSchema.safeParse(data);
        if (!r.success) toast.error(r.error.issues[0]?.message ?? "Check your details.");
      }
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to confirm a booking.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submit({
        data: {
          booking_date: data.date,
          booking_time: data.time,
          party: data.party,
          guest_name: data.guest_name.trim(),
          guest_phone: data.guest_phone.trim(),
          guest_email: data.guest_email.trim(),
          mood: data.mood || null,
          occasion: data.occasion === "None" ? null : data.occasion,
          seating_preference: data.seating_preference === "No Preference" ? null : data.seating_preference,
          requests: data.requests || null,
          table_id: data.table_id || null,
        },
      });
      setConfirmed(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <SiteShell>
        <section className="max-w-3xl mx-auto px-4 md:px-8 pt-24 pb-32 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">Section 003</p>
          <h1 className="font-display text-6xl mt-3">Sign in to book.</h1>
          <p className="mt-6 font-serif italic text-ink/70">we need a name, phone and email on the slip so we can hold your seat.</p>
          <Link
            to="/auth"
            search={{ redirect: "/booking" } as never}
            className="inline-block mt-8 px-8 py-4 bg-accent text-paper font-display text-2xl hover:scale-105 transition-transform"
          >
            sign in →
          </Link>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section ref={sectionRef} className="max-w-3xl mx-auto px-4 md:px-8 pt-16 pb-12">
        <p data-reveal className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">Section 003 · reservation slip</p>
        <h1 data-reveal className="font-display text-6xl md:text-7xl mt-3">Book a corner.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />
        <p data-reveal className="mt-2 font-mono text-[10px] uppercase tracking-widest opacity-60">open 12 pm → 3 am · every night</p>

        <div data-reveal className="mt-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest opacity-70">
          {stepLabels.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={i + 1 <= step ? "text-accent" : ""}>0{i + 1}. {s}</span>
              {i < stepLabels.length - 1 && <span className="opacity-30">/</span>}
            </div>
          ))}
        </div>

        <div data-reveal className="mt-10 bg-white/60 border border-ink/10 p-8 md:p-12 shadow-lg relative">
          <CoffeeCup className="absolute -top-6 -right-6 size-14 text-ink rotate-12 bg-paper rounded-full p-1.5" />

          {!confirmed && step === 1 && (
            <div className="space-y-6">
              <label className="block font-display text-3xl">When are you coming?</label>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={data.date}
                onChange={(e) => setData({ ...data, date: e.target.value })}
                className="bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-lg pb-2 w-full"
              />
            </div>
          )}

          {!confirmed && step === 2 && (
            <div className="space-y-6">
              <label className="block font-display text-3xl">How many of you?</label>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setData({ ...data, party: Math.max(1, data.party - 1) })}
                  className="size-12 border-2 border-ink rounded-full font-display text-2xl"
                >
                  −
                </button>
                <span className="font-display text-6xl text-accent">{data.party}</span>
                <button
                  onClick={() => setData({ ...data, party: Math.min(20, data.party + 1) })}
                  className="size-12 border-2 border-ink rounded-full font-display text-2xl"
                >
                  +
                </button>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">we'll match you to the smallest table that fits.</p>
            </div>
          )}

          {!confirmed && step === 3 && (
            <div className="space-y-6">
              <label className="block font-display text-3xl">Pick a time slot.</label>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 -mt-3">
                kitchen open 12 pm → 3 am · {avail?.any_fitting_tables === false
                  ? `no tables fit party of ${data.party} — try fewer guests`
                  : avail?.any_fitting_tables
                  ? `${(avail as any).all_fitting_tables?.length || 0} table(s) fit party of ${data.party}`
                  : "checking availability…"}
              </p>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {TIMES.map((t) => (
                  (() => {
                    const tables = availableTables(t);
                    const left = tables.length;
                    const full = left === 0 && !!avail;
                    return (
                      <button
                        key={t}
                        disabled={full}
                        onClick={() => setData({ ...data, time: t, table_id: "" })}
                        title={full ? "fully booked" : `${left} left`}
                        className={`relative border border-ink/20 px-3 py-2 font-display text-lg transition-colors ${
                          data.time === t ? "bg-ink text-paper" : full ? "opacity-30 line-through cursor-not-allowed" : "hover:bg-ink/10"
                        }`}
                      >
                        {t}
                        {!full && left <= 2 && data.time !== t && (
                          <span className="absolute -top-2 -right-2 bg-accent text-paper text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                            {left} left
                          </span>
                        )}
                      </button>
                    );
                  })()
                ))}
              </div>
            </div>
          )}

          {!confirmed && step === 4 && (
            <div className="space-y-6">
              <label className="block font-display text-3xl">Pick a table.</label>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 -mt-3">
                optional · or let us choose the best fit for you.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setData({ ...data, table_id: "" })}
                  className={`border border-ink/20 p-4 text-left transition-colors ${data.table_id === "" ? "bg-ink text-paper" : "hover:bg-ink/10"}`}
                >
                  <p className="font-display text-xl">Auto Assign</p>
                  <p className="font-mono text-[10px] uppercase opacity-60">Any available table</p>
                </button>
                {availableTables(data.time).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setData({ ...data, table_id: t.id })}
                    className={`border border-ink/20 p-4 text-left transition-colors ${data.table_id === t.id ? "bg-ink text-paper" : "hover:bg-ink/10"}`}
                  >
                    <p className="font-display text-xl">Table {t.table_no}</p>
                    <p className="font-mono text-[10px] uppercase opacity-60">{t.location} · seats {t.capacity}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!confirmed && step === 5 && (
            <div className="space-y-5">
              <label className="block font-display text-3xl">Who's coming?</label>
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">name</p>
                  <input
                    value={data.guest_name}
                    onChange={(e) => setData({ ...data, guest_name: e.target.value })}
                    placeholder="Your full name"
                    className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-base pb-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">phone</p>
                    <input
                      value={data.guest_phone}
                      onChange={(e) => setData({ ...data, guest_phone: e.target.value })}
                      placeholder="+91 98xxxxxxxx"
                      className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-base pb-1"
                    />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">email</p>
                    <input
                      type="email"
                      value={data.guest_email}
                      onChange={(e) => setData({ ...data, guest_email: e.target.value })}
                      placeholder="you@email.com"
                      className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-base pb-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">occasion</p>
                    <select
                      value={data.occasion}
                      onChange={(e) => setData({ ...data, occasion: e.target.value })}
                      className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-base pb-1"
                    >
                      {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">seating</p>
                    <select
                      value={data.seating_preference}
                      onChange={(e) => setData({ ...data, seating_preference: e.target.value })}
                      className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono text-base pb-1"
                    >
                      {SEATING.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">special requests / allergies</p>
                  <textarea
                    value={data.requests}
                    onChange={(e) => setData({ ...data, requests: e.target.value })}
                    rows={2}
                    maxLength={500}
                    placeholder="charger near seat? nut allergy?"
                    className="w-full bg-transparent border-2 border-ink/20 focus:border-accent outline-none font-mono text-sm p-3 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {!confirmed && step === 6 && (
            <div className="space-y-6">
              <label className="block font-display text-3xl">What's the mood?</label>
              <div className="flex flex-wrap gap-3">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setData({ ...data, mood: m })}
                    className={`px-5 py-2 border border-ink/20 rounded-full font-display text-xl transition-colors ${
                      data.mood === m ? "bg-accent text-paper border-accent" : "hover:bg-ink hover:text-paper"
                    }`}
                  >
                    {m.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!confirmed && step === 7 && (
            <div className="space-y-4">
              <label className="block font-display text-3xl">Review &amp; confirm.</label>
              <div className="bg-paper border border-ink/15 p-6 font-mono text-sm space-y-1">
                <p><span className="opacity-50">date:</span> {data.date}</p>
                <p><span className="opacity-50">party:</span> {data.party}</p>
                <p><span className="opacity-50">time:</span> {data.time}</p>
                <p><span className="opacity-50">table:</span> {data.table_id ? `Table ${availableTables(data.time).find(t => t.id === data.table_id)?.table_no || 'Selected'}` : 'Auto Assign'}</p>
                <p><span className="opacity-50">name:</span> {data.guest_name}</p>
                <p><span className="opacity-50">phone:</span> {data.guest_phone}</p>
                <p><span className="opacity-50">email:</span> {data.guest_email}</p>
                {data.occasion !== "None" && <p><span className="opacity-50">occasion:</span> {data.occasion}</p>}
                {data.seating_preference !== "No Preference" && <p><span className="opacity-50">seating:</span> {data.seating_preference}</p>}
                {data.mood && <p><span className="opacity-50">mood:</span> {data.mood}</p>}
                {data.requests && <p><span className="opacity-50">note:</span> {data.requests}</p>}
              </div>
              <ul className="font-mono text-[11px] uppercase tracking-widest opacity-60 space-y-1 pt-2">
                <li>· 15 min grace period for late arrivals</li>
                <li>· table held for 2 hours</li>
                <li>· cancel anytime — no charge</li>
              </ul>
            </div>
          )}

          {confirmed && (
            <div className="space-y-4 text-center py-6 animate-ink-spread">
              <Star className="size-12 text-accent mx-auto" />
              <h2 className="font-display text-5xl">You're in.</h2>
              <p className="font-mono text-xs uppercase tracking-widest opacity-60">ref · {confirmed.reference_code}</p>
              <div className="mt-6 inline-block text-left bg-paper border border-ink/15 p-6 font-mono text-sm space-y-1">
                <p><span className="opacity-50">date:</span> {confirmed.booking_date}</p>
                <p><span className="opacity-50">time:</span> {confirmed.booking_time}</p>
                <p><span className="opacity-50">party:</span> {data.party}</p>
                <p><span className="opacity-50">table:</span> {confirmed.table_no} · seats {confirmed.table_capacity}</p>
                <p><span className="opacity-50">name:</span> {data.guest_name}</p>
              </div>
              <p className="font-display text-xl italic mt-6 text-accent">see you after hours.</p>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">save your reference — quote it at the door.</p>
            </div>
          )}

          {!confirmed && (
            <div className="mt-10 flex items-center justify-between">
              <button
                onClick={back}
                disabled={step === 1}
                className="font-mono text-xs uppercase tracking-widest opacity-60 hover:opacity-100 disabled:opacity-20"
              >
                ← back
              </button>
              {step < TOTAL_STEPS ? (
                <button
                  onClick={next}
                  className="px-6 py-2 bg-ink text-paper font-display text-xl hover:scale-105 transition-transform"
                >
                  next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-accent text-paper font-display text-xl hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {submitting ? "holding table…" : "confirm booking"}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}