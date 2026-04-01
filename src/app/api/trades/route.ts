import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/middleware/rate-limit'

function getFreeWindowStart() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().slice(0, 10)
}

async function handleGet(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '25') || 25))
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const offset = (page - 1) * limit

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
      { count: 'exact' },
    )
    .order('disclosure_date', { ascending: false, nullsFirst: false })
    .order('transaction_date', { ascending: false })

  if (!isPremium) {
    query = query.gte('transaction_date', getFreeWindowStart())
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    data: data ?? [],
    page,
    limit,
    count: count ?? 0,
    access: isPremium ? 'premium' : 'free',
  })
}

export const GET = withRateLimit(handleGet)
