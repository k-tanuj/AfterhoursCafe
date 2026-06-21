import type {
  BookingRecord,
  DayPrediction,
  Predictions,
} from "./demand.types";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_START = 17; // 5pm
const HOUR_END = 26; // 2am next day (we mod 24 for display)
const KNOWN_MOODS = ["Date", "Studying", "Hanging Out", "Creative"];

function parseHour(raw: string | null): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  // matches "7", "7:00", "7 pm", "7:30 pm", "19:00"
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ampm = m[3];
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h >= 0 && h <= 23) return h;
  return null;
}

function parseDate(b: BookingRecord): Date | null {
  if (b.booking_date) {
    const d = new Date(b.booking_date);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(b.created_at);
  return isNaN(d.getTime()) ? null : d;
}

function startOfNextWeek(now: Date): Date {
  // Monday-start week. If today is Mon, return next Monday.
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const daysUntilNextMon = ((8 - day) % 7) || 7;
  d.setDate(d.getDate() + daysUntilNextMon);
  return d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Build baseline (cold start) predictions when there's no history.
function baselinePredictions(weekStart: Date): Predictions {
  // Heuristic: weekends busy, midweek steady, Mon/Tue quiet. Peak around 9-11pm.
  const baseByDow = [10, 5, 6, 7, 9, 14, 16]; // Sun..Sat avg bookings/day
  const hourCurve = (h: number) => {
    // 17..25 (treat 24,25 as 0,1 next day)
    const peak = 22; // 10pm
    const dist = Math.abs(h - peak);
    return Math.max(0.15, 1 - dist * 0.18);
  };
  const days: DayPrediction[] = [];
  let totalBookings = 0;
  let totalCovers = 0;
  const partyTotals = { p1: 0, p2: 0, p34: 0, p5: 0 };
  const moodTotals: Record<string, number> = Object.fromEntries(
    KNOWN_MOODS.map((m) => [m, 0])
  );
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dow = date.getDay();
    const base = baseByDow[dow];
    const by_hour: { hour: number; value: number }[] = [];
    let dayTotal = 0;
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      const v = Math.max(0, base * hourCurve(h) * 0.18);
      by_hour.push({ hour: h % 24, value: round1(v) });
      dayTotal += v;
    }
    const predicted_bookings = Math.round(dayTotal);
    const avgParty = 2.4;
    const predicted_covers = Math.round(predicted_bookings * avgParty);
    const party_mix = {
      p1: round1(predicted_bookings * 0.25),
      p2: round1(predicted_bookings * 0.4),
      p34: round1(predicted_bookings * 0.25),
      p5: round1(predicted_bookings * 0.1),
    };
    const mood_mix: Record<string, number> = {
      Date: round1(predicted_bookings * 0.3),
      Studying: round1(predicted_bookings * 0.3),
      "Hanging Out": round1(predicted_bookings * 0.25),
      Creative: round1(predicted_bookings * 0.15),
    };
    const tag = tagFor(predicted_bookings, baseByDow);
    days.push({
      date: fmtDate(date),
      dow,
      dow_label: DOW_LABELS[dow],
      predicted_bookings,
      predicted_covers,
      low: Math.max(0, Math.round(predicted_bookings * 0.7)),
      high: Math.round(predicted_bookings * 1.3),
      tag,
      by_hour,
      party_mix,
      mood_mix,
    });
    totalBookings += predicted_bookings;
    totalCovers += predicted_covers;
    partyTotals.p1 += party_mix.p1;
    partyTotals.p2 += party_mix.p2;
    partyTotals.p34 += party_mix.p34;
    partyTotals.p5 += party_mix.p5;
    for (const m of KNOWN_MOODS) moodTotals[m] += mood_mix[m];
  }
  return {
    days,
    totals: {
      bookings: totalBookings,
      covers: totalCovers,
      party_mix: roundObj(partyTotals),
      mood_mix: roundObj(moodTotals),
    },
    hours_range: { start: HOUR_START, end: HOUR_END },
    generated_for: {
      week_start: fmtDate(weekStart),
      week_end: fmtDate(addDays(weekStart, 6)),
    },
    cold_start: true,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function roundObj<T extends Record<string, number>>(o: T): T {
  const out: any = {};
  for (const k of Object.keys(o)) out[k] = round1(o[k]);
  return out;
}

function tagFor(value: number, baseByDow: number[]): "busy" | "steady" | "quiet" {
  const max = Math.max(...baseByDow);
  if (value >= max * 0.85) return "busy";
  if (value <= max * 0.4) return "quiet";
  return "steady";
}

// Train on historical bookings. Returns the predictions, MAE on holdout
// (most recent 7 days), and the actual sample size used.
export async function trainAndPredict(
  bookings: BookingRecord[],
  now: Date = new Date()
): Promise<{
  predictions: Predictions;
  mae: number | null;
  sample_size: number;
  training_window_start: string | null;
  training_window_end: string | null;
  notes: string | null;
}> {
  const weekStart = startOfNextWeek(now);

  // Normalize bookings
  type N = { date: Date; dow: number; hour: number; party: number; mood: string };
  const rows: N[] = [];
  for (const b of bookings) {
    const d = parseDate(b);
    const h = parseHour(b.booking_time);
    if (!d || h == null) continue;
    rows.push({
      date: d,
      dow: d.getDay(),
      hour: h,
      party: Math.max(1, b.party ?? 2),
      mood: KNOWN_MOODS.includes(b.mood ?? "") ? (b.mood as string) : "Hanging Out",
    });
  }

  // Removed the 'if (rows.length < 14)' cold start check.
  // We will now always use the Python ML model for predictions, 
  // even if there is no local database history yet!

  // Cut window to last 8 weeks
  const cutoff = addDays(now, -56);
  const window = rows.filter((r) => r.date >= cutoff);
  const start = window.length > 0 ? window.reduce((m, r) => (r.date < m ? r.date : m), window[0].date) : cutoff;
  const end = window.length > 0 ? window.reduce((m, r) => (r.date > m ? r.date : m), window[0].date) : now;

  // Holdout = last 7 days for MAE
  const holdoutCutoff = addDays(now, -7);
  const trainSet = window.filter((r) => r.date < holdoutCutoff);
  const holdSet = window.filter((r) => r.date >= holdoutCutoff);

  // Number of weeks in training window (for averaging)
  const trainSpanDays = Math.max(
    7,
    Math.ceil((holdoutCutoff.getTime() - start.getTime()) / 86400000)
  );
  const trainWeeks = Math.max(1, trainSpanDays / 7);

  // Aggregate by (dow, hour)
  const slot = (dow: number, hour: number) => `${dow}|${hour}`;
  const slotCount = new Map<string, number>();
  const slotRecentCount = new Map<string, number>(); // last 14 days, weighted
  const recentCutoff = addDays(now, -14);
  for (const r of trainSet) {
    const k = slot(r.dow, r.hour);
    slotCount.set(k, (slotCount.get(k) ?? 0) + 1);
    if (r.date >= recentCutoff) {
      slotRecentCount.set(k, (slotRecentCount.get(k) ?? 0) + 1);
    }
  }

  // Party + mood overall mix from training set
  const partyBuckets = { p1: 0, p2: 0, p34: 0, p5: 0 };
  const moodBuckets: Record<string, number> = Object.fromEntries(
    KNOWN_MOODS.map((m) => [m, 0])
  );
  for (const r of trainSet) {
    if (r.party === 1) partyBuckets.p1++;
    else if (r.party === 2) partyBuckets.p2++;
    else if (r.party <= 4) partyBuckets.p34++;
    else partyBuckets.p5++;
    moodBuckets[r.mood]++;
  }
  const partyTotal = Object.values(partyBuckets).reduce((a, b) => a + b, 0) || 1;
  const moodTotal = Object.values(moodBuckets).reduce((a, b) => a + b, 0) || 1;
  const partyShare = {
    p1: partyBuckets.p1 / partyTotal,
    p2: partyBuckets.p2 / partyTotal,
    p34: partyBuckets.p34 / partyTotal,
    p5: partyBuckets.p5 / partyTotal,
  };
  const moodShare: Record<string, number> = {};
  for (const m of KNOWN_MOODS) moodShare[m] = moodBuckets[m] / moodTotal;

  // Avg party size for covers
  const avgParty =
    trainSet.reduce((a, r) => a + r.party, 0) / Math.max(1, trainSet.length) || 2.4;

  // Per-slot predicted bookings = blend(historical avg, recent avg) or Python ML
  const predictSlot = async (dow: number, hour: number): Promise<number> => {
    try {
        // Map JS dow (0=Sun, 6=Sat) to Python model dow (1=Mon, 7=Sun)
        const pyDow = dow === 0 ? 7 : dow;
        // Default weather/promo values for future dates. In a real system, you'd fetch weather forecasts.
        const url = `http://127.0.0.1:8000/predict?hour=${hour}&day_of_week=${pyDow}&is_holiday=0&temp_c=22.0&is_raining=0&active_promo=0`;
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        return data.predicted_bookings || 0;
    } catch (e) {
        // Fallback to simple heuristic if python API is down
        const hist = (slotCount.get(slot(dow, hour)) ?? 0) / trainWeeks;
        const recent = (slotRecentCount.get(slot(dow, hour)) ?? 0) / 2; // 2 weeks
        return 0.6 * hist + 0.4 * recent;
    }
  };

  // Build 7-day predictions
  const days: DayPrediction[] = [];
  const dayTotals: number[] = [];
  let totalBookings = 0;
  let totalCovers = 0;
  const partyTotals = { p1: 0, p2: 0, p34: 0, p5: 0 };
  const moodTotals: Record<string, number> = Object.fromEntries(
    KNOWN_MOODS.map((m) => [m, 0])
  );

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dow = date.getDay();
    let dayTotal = 0;
    const by_hour: { hour: number; value: number }[] = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      const hourMod = h % 24;
      const v = await predictSlot(dow, hourMod);
      by_hour.push({ hour: hourMod, value: round1(v) });
      dayTotal += v;
    }
    const predicted_bookings = Math.round(dayTotal);
    const predicted_covers = Math.round(predicted_bookings * avgParty);
    const party_mix = {
      p1: round1(predicted_bookings * partyShare.p1),
      p2: round1(predicted_bookings * partyShare.p2),
      p34: round1(predicted_bookings * partyShare.p34),
      p5: round1(predicted_bookings * partyShare.p5),
    };
    const mood_mix: Record<string, number> = {};
    for (const m of KNOWN_MOODS) mood_mix[m] = round1(predicted_bookings * moodShare[m]);

    days.push({
      date: fmtDate(date),
      dow,
      dow_label: DOW_LABELS[dow],
      predicted_bookings,
      predicted_covers,
      low: Math.max(0, Math.round(predicted_bookings * 0.75)),
      high: Math.round(predicted_bookings * 1.25),
      tag: "steady",
      by_hour,
      party_mix,
      mood_mix,
    });
    dayTotals.push(predicted_bookings);
    totalBookings += predicted_bookings;
    totalCovers += predicted_covers;
    partyTotals.p1 += party_mix.p1;
    partyTotals.p2 += party_mix.p2;
    partyTotals.p34 += party_mix.p34;
    partyTotals.p5 += party_mix.p5;
    for (const m of KNOWN_MOODS) moodTotals[m] += mood_mix[m];
  }
  // Tag days relative to this week
  const maxDay = Math.max(...dayTotals, 1);
  for (let i = 0; i < days.length; i++) {
    const v = days[i].predicted_bookings;
    days[i].tag = v >= maxDay * 0.85 ? "busy" : v <= maxDay * 0.4 ? "quiet" : "steady";
  }

  // MAE on holdout: per (dow, hour), compare predicted vs actual count
  let mae: number | null = null;
  if (holdSet.length > 0) {
    // group holdout by (date, dow, hour)
    const actual = new Map<string, number>(); // dateISO|dow|hour
    for (const r of holdSet) {
      const k = `${fmtDate(r.date)}|${r.dow}|${r.hour}`;
      actual.set(k, (actual.get(k) ?? 0) + 1);
    }
    let absErr = 0;
    let n = 0;
    // unique (date, hour) cells in holdout window range
    const seenDates = new Set<string>();
    for (const r of holdSet) seenDates.add(fmtDate(r.date));
    for (const ds of seenDates) {
      const d = new Date(ds);
      const dow = d.getDay();
      for (let h = HOUR_START; h <= HOUR_END; h++) {
        const hourMod = h % 24;
        const k = `${ds}|${dow}|${hourMod}`;
        const a = actual.get(k) ?? 0;
        const p = await predictSlot(dow, hourMod);
        absErr += Math.abs(p - a);
        n++;
      }
    }
    mae = n > 0 ? round1(absErr / n) : null;
  }

  return {
    predictions: {
      days,
      totals: {
        bookings: totalBookings,
        covers: totalCovers,
        party_mix: roundObj(partyTotals),
        mood_mix: roundObj(moodTotals),
      },
      hours_range: { start: HOUR_START, end: HOUR_END },
      generated_for: {
        week_start: fmtDate(weekStart),
        week_end: fmtDate(addDays(weekStart, 6)),
      },
      cold_start: false,
    },
    mae,
    sample_size: window.length,
    training_window_start: fmtDate(start),
    training_window_end: fmtDate(end),
    notes: null,
  };
}