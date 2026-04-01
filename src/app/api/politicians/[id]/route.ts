import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/middleware/rate-limit'

type RouteContext = {
  params: Promise<{ id: string }>
}

function getFreeWindowStart() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().slice(0, 10)
}

async function handleGet(_request: Request, context: RouteContext) {
  const { id } = await context.params
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

  const { data: politician, error: politicianError } = await supabase
    .from('politicians')
    .select('id, full_name, party, chamber, state, image_url')
    .eq('id', id)
    .maybeSingle()

  if (politicianError) {
    return Response.json({ error: politicianError.message }, { status: 500 })
  }

  if (!politician) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  let tradesQuery = supabase
    .from('trades')
    .select('id, transaction_date, disclosure_date, ticker, asset_name, transaction_type, amount_range_raw')
    .eq('politician_id', id)
    .order('transaction_date', { ascending: false })
    .limit(100)

  if (!isPremium) {
    tradesQuery = tradesQuery.gte('transaction_date', getFreeWindowStart())
  }

  const { data: trades, error: tradesError } = await tradesQuery

  if (tradesError) {
    return Response.json({ error: tradesError.message }, { status: 500 })
  }

  return Response.json({
    politician,
    trades: trades ?? [],
    access: isPremium ? 'premium' : 'free',
  })
}

export const GET = withRateLimit(handleGet)
