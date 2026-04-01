import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { getStockQuote } from '@/lib/stock-price-service'

type RouteContext = {
  params: Promise<{ ticker: string }>
}

function getFreeWindowStart() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().slice(0, 10)
}

async function handleGet(_request: Request, context: RouteContext) {
  const { ticker } = await context.params
  const normalizedTicker = ticker.toUpperCase()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isPremium = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .maybeSingle()

    isPremium = profile?.is_premium ?? false
  }

  let query = supabase
    .from('trades')
    .select(
      'id, transaction_date, disclosure_date, ticker, asset_name, transaction_type, amount_range_raw, politicians(id, full_name, party, chamber)',
    )
    .eq('ticker', normalizedTicker)
    .order('transaction_date', { ascending: false })
    .limit(100)

  if (!isPremium) {
    query = query.gte('transaction_date', getFreeWindowStart())
  }

  const [{ data: trades, error }, quote] = await Promise.all([
    query,
    getStockQuote(normalizedTicker),
  ])

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    ticker: normalizedTicker,
    quote,
    trades: trades ?? [],
    access: isPremium ? 'premium' : 'free',
  })
}

export const GET = withRateLimit(handleGet)
