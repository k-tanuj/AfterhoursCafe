
-- 1. Restaurant tables inventory
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_no text NOT NULL UNIQUE,
  capacity integer NOT NULL CHECK (capacity > 0),
  location text NOT NULL DEFAULT 'indoor',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.restaurant_tables TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tables" ON public.restaurant_tables
  FOR SELECT USING (true);
CREATE POLICY "Admins manage tables" ON public.restaurant_tables
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER restaurant_tables_updated BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Extend bookings
ALTER TABLE public.bookings
  ADD COLUMN guest_name text,
  ADD COLUMN guest_phone text,
  ADD COLUMN guest_email text,
  ADD COLUMN occasion text,
  ADD COLUMN seating_preference text,
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  ADD COLUMN reference_code text UNIQUE;

CREATE INDEX bookings_date_time_idx ON public.bookings(booking_date, booking_time);
CREATE INDEX bookings_table_idx ON public.bookings(table_id, booking_date, booking_time);

-- 3. Seed a few tables so the app is usable immediately
INSERT INTO public.restaurant_tables (table_no, capacity, location) VALUES
  ('T1', 2, 'indoor'),
  ('T2', 2, 'indoor'),
  ('T3', 4, 'indoor'),
  ('T4', 4, 'window'),
  ('T5', 6, 'indoor'),
  ('T6', 8, 'outdoor');
