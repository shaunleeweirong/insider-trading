import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/middleware/rate-limit'

type ExportTradeRow = {
  transaction_date: string
  ticker: string | null
  asset_name: string
  transaction_type: string
  amount_range_raw: string
  politicians:
    | {
        full_name: string
        party: 'Democrat' | 'Republican' | 'Independent' | null
        chamber: 'Senate' | 'House'
      }
    | {
        full_name: string
        party: 'Democrat' | 'Republican' | 'Independent' | null
        chamber: 'Senate' | 'House'
      }[]
    | null
}

function escapeCsv(value: string | null) {
  const normalized = value ?? ''
  return `"${normalized.replaceAll('"', '""')}"`
}

function toPolitician(row: ExportTradeRow) {
  if (Array.isArray(row.politicians)) {
    return row.politicians[0] ?? null
  }

  return row.politicians
}

function buildCsv(rows: ExportTradeRow[]) {
  const header = [
    'Date',
    'Politician',
    'Party',
    'Chamber',
    'Ticker',
    'Asset',
    'Type',
    'Amount Range',
  ]

  const lines = rows.flatMap((row) => {
    const politician = toPolitician(row)
    if (!politician) return []

    return [
      [
        escapeCsv(row.transaction_date),
        escapeCsv(politician.full_name),
        escapeCsv(politician.party),
        escapeCsv(politician.chamber),
        escapeCsv(row.ticker),
        escapeCsv(row.asset_name),
        escapeCsv(row.transaction_type),
        escapeCsv(row.amount_range_raw),
      ].join(','),
    ]
  })

  return [header.map(escapeCsv).join(','), ...lines].join('\n')
}

async function handleGet(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_premium) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const politicianId = searchParams.get('politician_id')
  const ticker = searchParams.get('ticker')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('trades')
    .select(
      'transaction_date, ticker, asset_name, transaction_type, amount_range_raw, politicians(full_name, party, chamber)',
    )
    .order('transaction_date', { ascending: false })
    .limit(10_000)

  if (politicianId) {
    query = query.eq('politician_id', politicianId)
  }

  if (ticker) {
    query = query.eq('ticker', ticker.toUpperCase())
  }

  if (from) {
    query = query.gte('transaction_date', from)
  }

  if (to) {
    query = query.lte('transaction_date', to)
  }

  const { data } = await query
  const csv = buildCsv((data ?? []) as ExportTradeRow[])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="trades-export.csv"',
    },
  })
}

export const GET = withRateLimit(handleGet)
