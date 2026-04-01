import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TradeTable, type TradeTableItem } from '@/components/trades/trade-table'
import { PoliticianHeader } from '@/components/politicians/politician-header'
import { PerformanceChart, type PerformancePoint } from '@/components/charts/performance-chart'
import { FollowButton } from '@/app/(app)/politicians/[id]/follow-button'
import { createClient } from '@/lib/supabase/server'
import { getHistoricalPrices } from '@/lib/stock-price-service'

type PoliticianDetailPageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PoliticianDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: politician } = await supabase
    .from('politicians')
    .select('full_name')
    .eq('id', id)
    .maybeSingle()

  if (!politician) {
    return {
      title: 'Politician',
      description: 'Congressional trade activity and disclosure history.',
    }
  }

  return {
    title: politician.full_name,
    description: `Review ${politician.full_name}'s congressional trade history and recent activity.`,
  }
}

type PoliticianRow = {
  id: string
  full_name: string
  party: 'Democrat' | 'Republican' | 'Independent' | null
  chamber: 'Senate' | 'House'
  state: string | null
  image_url: string | null
}

type TradeRow = {
  id: string
  transaction_date: string
  disclosure_date: string | null
  ticker: string | null
  asset_name: string
  transaction_type: TradeTableItem['transaction_type']
  amount_range_raw: string
}

function getStartDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function toTradeTableItems(trades: TradeRow[], politician: PoliticianRow): TradeTableItem[] {
  return trades.map((trade) => ({
    ...trade,
    politician: {
      id: politician.id,
      full_name: politician.full_name,
      party: politician.party,
      chamber: politician.chamber,
    },
  }))
}

function getMostTradedTicker(trades: TradeRow[]) {
  const counts = new Map<string, number>()

  for (const trade of trades) {
    if (!trade.ticker) continue
    counts.set(trade.ticker, (counts.get(trade.ticker) ?? 0) + 1)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function buildChartData({
  trades,
  prices,
}: {
  trades: TradeRow[]
  prices: Array<{ date: string; close_price: number }>
}): PerformancePoint[] {
  const tradeMap = new Map<string, TradeRow['transaction_type']>()

  for (const trade of trades) {
    if (!tradeMap.has(trade.transaction_date)) {
      tradeMap.set(trade.transaction_date, trade.transaction_type)
    }
  }

  return prices
    .map((price) => ({
      date: price.date,
      close: price.close_price,
      tradeType: tradeMap.get(price.date),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export default async function PoliticianDetailPage({ params }: PoliticianDetailPageProps) {
  const { id } = await params
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

  const { data: politician } = await supabase
    .from('politicians')
    .select('id, full_name, party, chamber, state, image_url')
    .eq('id', id)
    .maybeSingle()

  if (!politician) {
    notFound()
  }

  let tradesQuery = supabase
    .from('trades')
    .select('id, transaction_date, disclosure_date, ticker, asset_name, transaction_type, amount_range_raw')
    .eq('politician_id', politician.id)
    .order('transaction_date', { ascending: false })

  if (!isPremium) {
    tradesQuery = tradesQuery.gte('transaction_date', getStartDate(30))
  }

  const { data: tradesData } = await tradesQuery
  const trades = (tradesData ?? []) as TradeRow[]
  const tradeItems = toTradeTableItems(trades, politician as PoliticianRow)
  const mostTradedTicker = getMostTradedTicker(trades)

  let chartData: PerformancePoint[] = []

  if (mostTradedTicker && trades.length > 0) {
    const oldestTradeDate = trades[trades.length - 1]?.transaction_date ?? getStartDate(30)
    const historical = await getHistoricalPrices(
      mostTradedTicker,
      new Date(oldestTradeDate),
      new Date(),
    )

    chartData = buildChartData({
      trades: trades.filter((trade) => trade.ticker === mostTradedTicker),
      prices: historical,
    })
  }

  return (
    <div className="space-y-6">
      <PoliticianHeader
        politician={politician as PoliticianRow}
        tradeCount={trades.length}
        mostTradedTicker={mostTradedTicker}
        isPremium={isPremium}
      />
      <div className="flex justify-end">
        <FollowButton politicianId={politician.id} isPremium={isPremium} />
      </div>
      <PerformanceChart
        title={mostTradedTicker ? `${mostTradedTicker} performance` : 'Performance chart'}
        data={chartData}
      />
      <TradeTable
        trades={tradeItems}
        emptyTitle="No trades found"
        emptyDescription="This politician does not have any synced trades in the current access window."
      />
    </div>
  )
}
