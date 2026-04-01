export type Party = 'Democrat' | 'Republican' | 'Independent'
export type Chamber = 'Senate' | 'House'
export type TradeTransactionType =
  | 'Purchase'
  | 'Sale'
  | 'Sale (Partial)'
  | 'Sale (Full)'
  | 'Exchange'

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'incomplete'
  | 'trialing'

export type SyncRunStatus = 'running' | 'completed' | 'failed'

export type Politician = {
  id: string
  full_name: string
  normalized_name: string
  first_name: string | null
  last_name: string | null
  party: Party | null
  chamber: Chamber
  state: string | null
  district: string | null
  bioguide_id: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Trade = {
  id: string
  politician_id: string
  transaction_date: string
  disclosure_date: string | null
  ticker: string | null
  asset_name: string
  asset_type: string | null
  transaction_type: TradeTransactionType
  amount_range_raw: string
  amount_min: number | null
  amount_max: number | null
  comment: string | null
  source: string
  created_at: string
}

export type Profile = {
  id: string
  email: string | null
  display_name: string | null
  is_premium: boolean
  is_admin: boolean
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export type Subscription = {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_price_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export type FollowedPolitician = {
  id: string
  user_id: string
  politician_id: string
  created_at: string
}

export type SyncRun = {
  id: string
  source: string
  status: SyncRunStatus
  started_at: string
  completed_at: string | null
  trades_fetched: number
  trades_inserted: number
  trades_skipped: number
  error_message: string | null
  created_at: string
}

export type StockPrice = {
  id: string
  ticker: string
  date: string
  close_price: number
  created_at: string
}
