import Link from 'next/link'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { Chamber, Party, PoliticianReturn } from '@/types/database'

const PAGE_SIZE = 25
const windowOptions = [
  { value: 'ytd', label: 'YTD' },
  { value: 'l12m', label: 'L12M' },
  { value: 'l5y', label: '5Y' },
] as const
const chamberOptions = ['All', 'Senate', 'House'] as const
const partyOptions = ['All', 'Democrat', 'Republican', 'Independent'] as const

type LeaderboardPageProps = {
  searchParams: Promise<{
    window?: string
    chamber?: string
    party?: string
    page?: string
  }>
}

type LeaderboardRow = PoliticianReturn & {
  politicians:
    | {
        id: string
        full_name: string
        party: Party | null
        state: string | null
        chamber: Chamber
      }
    | Array<{
        id: string
        full_name: string
        party: Party | null
        state: string | null
        chamber: Chamber
      }>
    | null
}

export const metadata: Metadata = {
  title: 'Leaderboard | CapitolTrades',
  description: 'Congressional trading returns leaderboard — YTD, L12M, and 5Y performance',
}

function formatPercent(value: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function buildLeaderboardHref({
  window,
  chamber,
  party,
  page,
}: {
  window: 'ytd' | 'l12m' | 'l5y'
  chamber: typeof chamberOptions[number]
  party: typeof partyOptions[number]
  page: number
}) {
  const params = new URLSearchParams()

  if (window !== 'ytd') params.set('window', window)
  if (chamber !== 'All') params.set('chamber', chamber)
  if (party !== 'All') params.set('party', party)
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return query ? `/leaderboard?${query}` : '/leaderboard'
}

function getRowPolitician(row: LeaderboardRow) {
  return Array.isArray(row.politicians) ? row.politicians[0] ?? null : row.politicians
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const params = await searchParams
  const window =
    params.window && windowOptions.some((option) => option.value === params.window)
      ? (params.window as 'ytd' | 'l12m' | 'l5y')
      : 'ytd'
  const chamber =
    params.chamber && chamberOptions.includes(params.chamber as never)
      ? (params.chamber as typeof chamberOptions[number])
      : 'All'
  const party =
    params.party && partyOptions.includes(params.party as never)
      ? (params.party as typeof partyOptions[number])
      : 'All'
  const currentPage = Math.max(1, Number(params.page ?? '1') || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  const supabase = await createClient()

  let query = supabase
    .from('politician_returns')
    .select(
      'id, politician_id, time_window, total_return_pct, deployed_capital, current_value, total_trades, open_positions, closed_positions, unresolvable_tickers, computed_at, created_at, politicians!inner(id, full_name, party, state, chamber)',
      { count: 'exact' },
    )
    .eq('time_window', window)
    .order('total_return_pct', { ascending: false, nullsFirst: false })

  if (chamber !== 'All') {
    query = query.eq('politicians.chamber', chamber)
  }

  if (party !== 'All') {
    query = query.eq('politicians.party', party)
  }

  const { data, count, error } = await query.range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as LeaderboardRow[]
  const totalRows = count ?? 0
  const hasPreviousPage = currentPage > 1
  const hasNextPage = offset + PAGE_SIZE < totalRows
  const lastUpdated = rows[0]?.computed_at ?? null

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Leaderboard</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Leaderboard</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Congressional trading returns ranked by estimated all-time performance. Tabs control who qualifies based on recent activity.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {windowOptions.map((option) => (
              <Button
                key={option.value}
                asChild
                variant={window === option.value ? 'default' : 'outline'}
                size="sm"
              >
                <Link
                  href={buildLeaderboardHref({
                    window: option.value,
                    chamber,
                    party,
                    page: 1,
                  })}
                >
                  {option.label}
                </Link>
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {chamberOptions.map((option) => (
              <Button
                key={option}
                asChild
                variant={chamber === option ? 'default' : 'outline'}
                size="sm"
              >
                <Link
                  href={buildLeaderboardHref({
                    window,
                    chamber: option,
                    party,
                    page: 1,
                  })}
                >
                  {option}
                </Link>
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {partyOptions.map((option) => (
              <Button
                key={option}
                asChild
                variant={party === option ? 'default' : 'outline'}
                size="sm"
              >
                <Link
                  href={buildLeaderboardHref({
                    window,
                    chamber,
                    party: option,
                    page: 1,
                  })}
                >
                  {option}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-medium text-foreground">Showing {totalRows} qualifying politicians</p>
          <p className="text-sm text-muted-foreground">
            {lastUpdated ? `Returns computed on ${formatTimestamp(lastUpdated)}` : 'Returns have not been computed yet.'}
          </p>
        </div>
        <p
          className="text-sm text-muted-foreground"
          title="Returns are estimated from congressional disclosure ranges and historical stock prices. Stock options and similar derivative-style trades are excluded, so actual performance may differ."
        >
          Returns are estimated from congressional disclosure ranges and historical stock prices. Stock options and similar derivative-style trades are excluded, so actual performance may differ.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center">
          <h3 className="text-base font-medium text-foreground">Returns have not been computed yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Check back after the next monthly computation.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Politician</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Party / State</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Chamber</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Return %</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trades</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Open / Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, index) => {
                  const politician = getRowPolitician(row)
                  const rank = offset + index + 1
                  const isPositive = (row.total_return_pct ?? 0) >= 0

                  if (!politician) {
                    return null
                  }

                  return (
                    <tr key={`${row.politician_id}-${row.time_window}`}>
                      <td className="px-4 py-4 font-medium text-foreground">#{rank}</td>
                      <td className="px-4 py-4">
                        <Link href={`/politicians/${politician.id}`} className="font-medium text-foreground hover:underline">
                          {politician.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {[politician.party, politician.state].filter(Boolean).join(' • ') || '—'}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{politician.chamber}</td>
                      <td
                        className={`px-4 py-4 font-medium ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatPercent(row.total_return_pct)}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{row.total_trades}</td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {row.open_positions} / {row.closed_positions}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            asChild
            variant="outline"
            disabled={!hasPreviousPage}
          >
            <Link href={buildLeaderboardHref({ window, chamber, party, page: Math.max(1, currentPage - 1) })}>
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">Page {currentPage}</span>
          <Button
            asChild
            variant="outline"
            disabled={!hasNextPage}
          >
            <Link href={buildLeaderboardHref({ window, chamber, party, page: currentPage + 1 })}>Next</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
