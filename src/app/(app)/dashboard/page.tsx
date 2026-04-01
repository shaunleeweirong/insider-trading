import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TradeTable, type TradeTableItem } from '@/components/trades/trade-table'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 25

type DashboardPageProps = {
  searchParams: Promise<{
    page?: string
  }>
}

type DashboardPolitician = {
  id: string
  full_name: string
  party: 'Democrat' | 'Republican' | 'Independent' | null
  chamber: 'Senate' | 'House'
}

type DashboardTradeRow = {
  id: string
  transaction_date: string
  disclosure_date: string | null
  ticker: string | null
  asset_name: string
  transaction_type: string
  amount_range_raw: string
  politicians: DashboardPolitician | DashboardPolitician[] | null
}

function getStartDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function toTradeTableItems(rows: DashboardTradeRow[]): TradeTableItem[] {
  return rows.flatMap((row) => {
    const politician = Array.isArray(row.politicians)
      ? row.politicians[0] ?? null
      : row.politicians

    if (!politician) {
      return []
    }

    return [
      {
        id: row.id,
        transaction_date: row.transaction_date,
        disclosure_date: row.disclosure_date,
        ticker: row.ticker,
        asset_name: row.asset_name,
        transaction_type: row.transaction_type as TradeTableItem['transaction_type'],
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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, Number(pageParam) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE
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
    query = query.gte('transaction_date', getStartDate(30))
  }

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)

  const trades = toTradeTableItems((data ?? []) as DashboardTradeRow[])
  const totalRows = count ?? 0
  const hasNextPage = offset + PAGE_SIZE < totalRows
  const nextPageHref = hasNextPage ? `/dashboard?page=${currentPage + 1}` : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary">{isPremium ? 'Premium access' : 'Free access'}</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Recent trades</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Track the latest congressional trades by politician, ticker, and disclosure timing.
          </p>
        </div>
        {!isPremium ? (
          <Button asChild>
            <Link href="/pricing">Upgrade to Premium</Link>
          </Button>
        ) : null}
      </div>

      {!isPremium ? (
        <Card>
          <CardHeader>
            <CardTitle>Free plan limit</CardTitle>
            <CardDescription>
              Free accounts can browse the last 30 days of trade activity. Upgrade to unlock full history and exports.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              You&apos;re viewing the latest 30-day window only.
            </p>
            <Button asChild variant="outline">
              <Link href="/pricing">See plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <TradeTable
        trades={trades}
        currentPage={currentPage}
        hasNextPage={hasNextPage}
        nextPageHref={nextPageHref}
        emptyTitle="No synced trades yet"
        emptyDescription="Run the trade sync and recent disclosures will appear here."
      />
    </div>
  )
}
