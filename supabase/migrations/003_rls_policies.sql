ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view politicians"
  ON politicians FOR SELECT
  USING (true);
CREATE POLICY "Service role can manage politicians"
  ON politicians FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view trades"
  ON trades FOR SELECT
  USING (true);
CREATE POLICY "Service role can manage trades"
  ON trades FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE followed_politicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own follows"
  ON followed_politicians FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follows"
  ON followed_politicians FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own follows"
  ON followed_politicians FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage followed_politicians"
  ON followed_politicians FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sync runs"
  ON sync_runs FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can manage sync runs"
  ON sync_runs FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stock prices"
  ON stock_prices FOR SELECT
  USING (true);
CREATE POLICY "Service role can manage stock prices"
  ON stock_prices FOR ALL
  USING (auth.role() = 'service_role');
