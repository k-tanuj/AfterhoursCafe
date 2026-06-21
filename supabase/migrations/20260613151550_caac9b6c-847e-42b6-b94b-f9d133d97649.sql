CREATE TABLE public.demand_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trained_at timestamptz NOT NULL DEFAULT now(),
  training_window_start date,
  training_window_end date,
  sample_size integer NOT NULL DEFAULT 0,
  mae numeric,
  predictions jsonb NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demand_forecasts TO authenticated;
GRANT ALL ON public.demand_forecasts TO service_role;

ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read demand forecasts"
ON public.demand_forecasts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX demand_forecasts_trained_at_idx
ON public.demand_forecasts (trained_at DESC);