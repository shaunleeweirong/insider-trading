import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { TradeTable, type TradeTableItem } from '@/components/trades/trade-table'
import { StockHeader } from '@/components/stocks/stock-header'
import { createClient } from '@/lib/supabase/server'
import { getStockQuote } from '@/lib/stock-price-service'

type StockPageProps = {
  params: Promise<{ ticker: string }>
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { ticker } = await params

  return {
    title: `${ticker.toUpperCase()} — Congressional Trades`,
    description: `Review recent congressional trading activity for ${ticker.toUpperCase()}.`,
  }
}

type StockTradeRow = {
  id: string
  transaction_date: string
  disclosure_date: string | null
  ticker: string | null
  asset_name: string
  transaction_type: TradeTableItem['transaction_type']
  amount_range_raw: string
  politicians:
    | {
        id: string
        full_name: string
        party: 'Democrat' | 'Republican' | 'Independent' | null
        chamber: 'Senate' | 'House'
      }
    | {
        id: string
        full_name: string
        party: 'Democrat' | 'Republican' | 'Independent' | null
        chamber: 'Senate' | 'House'
      }[]
    | null
}

function getStartDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function toTradeTableItems(rows: StockTradeRow[]): TradeTableItem[] {
  return rows.flatMap((row) => {
    const politician = Array.isArray(row.politicians) ? row.politicians[0] ?? null : row.politicians
    if (!politician) return []

    return [
      {
        id: row.id,
        transaction_date: row.transaction_date,
        disclosure_date: row.disclosure_date,
        ticker: row.ticker,
        asset_name: row.asset_name,
        transaction_type: row.transaction_type,
        amount_range_raw: row.amount_range_raw,
        politician: {
          id: politician.id,
          full_name: politician.full_name,
          party: politician.party,
          chamber: politician.chamber,
        },
      },
    ]
  })
}

function getQuoteDetails(quote: Awaited<ReturnType<typeof getStockQuote>>) {
  if (!quote) {
    return {
      companyName: null,
      price: null,
      change: null,
    }
  }

  if ('name' in quote) {
    return {
      companyName: quote.name,
      price: quote.price,
      change: quote.change,
    }
  }

  return {
    companyName: null,
    price: quote.close_price,
    change: null,
  }
}

export default async function StockPage({ params }: StockPageProps) {
  const { ticker } = await params
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

  if (!isPremium) {
    query = query.gte('transaction_date', getStartDate(30))
  }

  const { data } = await query
  const trades = toTradeTableItems((data ?? []) as StockTradeRow[])
  const quote = await getStockQuote(normalizedTicker)
  const quoteDetails = getQuoteDetails(quote)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Stock activity</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Ticker detail</h1>
      </div>

      <StockHeader
        ticker={normalizedTicker}
        companyName={quoteDetails.companyName}
        price={quoteDetails.price}
        change={quoteDetails.change}
      />

      {!isPremium ? (
        <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          Free accounts can browse the last 30 days of ticker activity.
        </div>
      ) : null}

      <TradeTable
        trades={trades}
        emptyTitle="No data available"
        emptyDescription="No synchronized trades or quote data were found for this ticker yet."
      />
    </div>
  )
}
