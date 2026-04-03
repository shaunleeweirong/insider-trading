import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/middleware/rate-limit'

async function handleGet(request: Request) {
  const { searchParams } = new URL(request.url)
  const q =
    searchParams.get('q')?.trim() ??
    searchParams.get('search')?.trim() ??
    ''
  const chamber = searchParams.get('chamber')
  const party = searchParams.get('party')
  const sort = searchParams.get('sort') === 'alphabetical' ? 'alphabetical' : 'most-trades'
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '24') || 24))

  const supabase = await createClient()
  let query = supabase
    .from('politicians')
    .select('id, full_name, party, chamber, state, image_url, trades(count)')
    .limit(limit)

  if (q) {
    query = query.ilike('full_name', `%${q}%`)
  }

  if (chamber && chamber !== 'All') {
    query = query.eq('chamber', chamber)
  }

  if (party && party !== 'All') {
    query = query.eq('party', party)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const results = [...(data ?? [])].sort((a, b) => {
    const aCount = Array.isArray(a.trades) ? a.trades.length : 0
    const bCount = Array.isArray(b.trades) ? b.trades.length : 0

    if (sort === 'alphabetical') {
      return a.full_name.localeCompare(b.full_name)
    }

    return bCount - aCount || a.full_name.localeCompare(b.full_name)
  })

  return Response.json({ data: results })
}

export const GET = withRateLimit(handleGet)
