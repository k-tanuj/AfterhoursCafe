
CREATE TABLE public.chill_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  text text NOT NULL,
  who text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chill_notes TO authenticated;
GRANT SELECT ON public.chill_notes TO anon;
GRANT ALL ON public.chill_notes TO service_role;
ALTER TABLE public.chill_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads notes" ON public.chill_notes FOR SELECT USING (true);
CREATE POLICY "auth users post notes" ON public.chill_notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE TABLE public.memory_polaroids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.memory_polaroids TO authenticated;
GRANT SELECT ON public.memory_polaroids TO anon;
GRANT ALL ON public.memory_polaroids TO service_role;
ALTER TABLE public.memory_polaroids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads polaroids" ON public.memory_polaroids FOR SELECT USING (true);
CREATE POLICY "users post own polaroids" ON public.memory_polaroids FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own polaroids" ON public.memory_polaroids FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX ON public.chill_notes (created_at DESC);
CREATE INDEX ON public.memory_polaroids (created_at DESC);
CREATE INDEX ON public.memory_polaroids (user_id, created_at DESC);
