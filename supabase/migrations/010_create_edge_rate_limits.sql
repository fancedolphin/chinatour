CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edge_rate_limits_updated_at
  ON public.edge_rate_limits (updated_at DESC);

ALTER TABLE public.edge_rate_limits DISABLE ROW LEVEL SECURITY;
