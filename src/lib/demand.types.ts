export type DayPrediction = {
  date: string; // YYYY-MM-DD
  dow: number; // 0 = Sun .. 6 = Sat
  dow_label: string;
  predicted_bookings: number;
  predicted_covers: number;
  low: number;
  high: number;
  tag: "busy" | "steady" | "quiet";
  by_hour: { hour: number; value: number }[];
  party_mix: { p1: number; p2: number; p34: number; p5: number };
  mood_mix: Record<string, number>;
};

export type Predictions = {
  days: DayPrediction[];
  totals: {
    bookings: number;
    covers: number;
    party_mix: { p1: number; p2: number; p34: number; p5: number };
    mood_mix: Record<string, number>;
  };
  hours_range: { start: number; end: number };
  generated_for: { week_start: string; week_end: string };
  cold_start: boolean;
};

export type ForecastRow = {
  id: string;
  trained_at: string;
  training_window_start: string | null;
  training_window_end: string | null;
  sample_size: number;
  mae: number | null;
  predictions: Predictions;
  notes: string | null;
};

export type BookingRecord = {
  booking_date: string | null;
  booking_time: string | null;
  party: number | null;
  mood: string | null;
  created_at: string;
};