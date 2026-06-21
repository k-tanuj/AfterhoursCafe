-- 1. menu_items table
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  image_url text,
  sort_order integer NOT NULL DEFAULT 100,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read available menu items"
  ON public.menu_items FOR SELECT
  USING (is_available = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert menu items"
  ON public.menu_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update menu items"
  ON public.menu_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menu items"
  ON public.menu_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER menu_items_touch_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed current menu (image_url left null for items 4-9 to mirror the existing fallback art)
INSERT INTO public.menu_items (name, category, description, price, sort_order) VALUES
  ('Ghost Shot Espresso', 'Strong', 'Double shot, no sugar, no mercy.', 180, 10),
  ('Cloudy Cold Brew', 'Cold', '12-hour brew, vanilla cream cloud.', 220, 20),
  ('Midnight Matcha', 'Sweet', 'Ceremonial grade, oat milk leaf.', 260, 30),
  ('Lavender Fog', 'Hot', 'Earl grey + steamed milk + lavender.', 200, 40),
  ('Burnt Honey Latte', 'Sweet', 'Caramelised honey, espresso, foam.', 240, 50),
  ('Saffron Cortado', 'Strong', 'Saffron-laced milk, two shots.', 280, 60),
  ('Study Drip', 'Study', 'Bottomless filter coffee, 3pm to 3am.', 150, 70),
  ('3am Mocha', 'Late Night', 'Dark chocolate, espresso, oat.', 250, 80),
  ('Insomnia Iced', 'Late Night', 'Cold brew + tonic. Bad idea, great taste.', 230, 90);

-- 2. Admin read/moderate policies on existing tables
CREATE POLICY "Admins can read all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all chill notes"
  ON public.chill_notes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete chill notes"
  ON public.chill_notes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all polaroids"
  ON public.memory_polaroids FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete polaroids"
  ON public.memory_polaroids FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));