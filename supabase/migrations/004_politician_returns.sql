CREATE TABLE politician_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  time_window TEXT NOT NULL CHECK (time_window IN ('ytd', 'l12m', 'l5y')),
  total_return_pct NUMERIC(10,4),
  deployed_capital NUMERIC(14,2),
  current_value NUMERIC(14,2),
  total_trades INTEGER NOT NULL DEFAULT 0,
  open_positions INTEGER NOT NULL DEFAULT 0,
  closed_positions INTEGER NOT NULL DEFAULT 0,
  unresolvable_tickers INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (politician_id, time_window)
);

CREATE INDEX idx_politician_returns_window_return
  ON politician_returns(time_window, total_return_pct DESC);

ALTER TABLE politician_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view politician_returns"
  ON politician_returns FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage politician_returns"
  ON politician_returns FOR ALL
  USING (auth.role() = 'service_role');
