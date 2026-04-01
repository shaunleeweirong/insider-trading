CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE politicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  party TEXT CHECK (party IN ('Democrat', 'Republican', 'Independent')),
  chamber TEXT NOT NULL CHECK (chamber IN ('Senate', 'House')),
  state TEXT,
  district TEXT,
  bioguide_id TEXT UNIQUE,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_politicians_normalized_name ON politicians(normalized_name);
CREATE INDEX idx_politicians_party ON politicians(party);
CREATE INDEX idx_politicians_chamber ON politicians(chamber);
CREATE INDEX idx_politicians_state ON politicians(state);

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politicians(id),
  transaction_date DATE NOT NULL,
  disclosure_date DATE,
  ticker TEXT,
  asset_name TEXT NOT NULL,
  asset_type TEXT,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('Purchase', 'Sale', 'Sale (Partial)', 'Sale (Full)', 'Exchange')
  ),
  amount_range_raw TEXT NOT NULL,
  amount_min INTEGER,
  amount_max INTEGER,
  comment TEXT,
  source TEXT NOT NULL DEFAULT 'fmp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (politician_id, ticker, transaction_date, amount_range_raw, transaction_type)
);

CREATE INDEX idx_trades_politician_id ON trades(politician_id);
CREATE INDEX idx_trades_transaction_date ON trades(transaction_date DESC);
CREATE INDEX idx_trades_ticker ON trades(ticker);
CREATE INDEX idx_trades_disclosure_date ON trades(disclosure_date DESC);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
