import Link from 'next/link'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PoliticianCard, type PoliticianCardItem } from '@/components/politicians/politician-card'
import { createClient } from '@/lib/supabase/server'

type PoliticiansPageProps = {
  searchParams: Promise<{
    q?: string
    chamber?: string
    party?: string
    sort?: string
  }>
}

type PoliticianRow = {
  id: string
  full_name: string
  party: PoliticianCardItem['party']
  chamber: PoliticianCardItem['chamber']
  state: string | null
  image_url: string | null
  trades: Array<{ count: number }> | null
}

const chamberOptions = ['All', 'Senate', 'House'] as const
const partyOptions = ['All', 'Democrat', 'Republican', 'Independent'] as const

export const metadata: Metadata = {
  title: 'Politicians',
  description: 'Browse congressional traders by chamber, party, and name.',
}

function toPoliticianCardItems(rows: PoliticianRow[]) {
  return rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    party: row.party,
    chamber: row.chamber,
    state: row.state,
    image_url: row.image_url,
    trade_count: row.trades?.length ?? 0,
  }))
}

function buildFilterHref({
  q,
  chamber,
  party,
  sort,
}: {
  q?: string
  chamber?: string
  party?: string
  sort?: string
}) {
  const params = new URLSearchParams()

  if (q) params.set('q', q)
  if (chamber && chamber !== 'All') params.set('chamber', chamber)
  if (party && party !== 'All') params.set('party', party)
  if (sort && sort !== 'most-trades') params.set('sort', sort)

  const query = params.toString()
  return query ? `/politicians?${query}` : '/politicians'
}

export default async function PoliticiansPage({ searchParams }: PoliticiansPageProps) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const chamber = params.chamber && chamberOptions.includes(params.chamber as never) ? params.chamber : 'All'
  const party = params.party && partyOptions.includes(params.party as never) ? params.party : 'All'
  const sort = params.sort === 'alphabetical' ? 'alphabetical' : 'most-trades'

  const supabase = await createClient()

  let query = supabase
    .from('politicians')
    .select('id, full_name, party, chamber, state, image_url, trades(count)')

  if (q) {
    query = query.ilike('full_name', `%${q}%`)
  }

  if (chamber !== 'All') {
    query = query.eq('chamber', chamber)
  }

  if (party !== 'All') {
    query = query.eq('party', party)
  }

  const { data } = await query
  const politicians = toPoliticianCardItems((data ?? []) as PoliticianRow[])
  const sortedPoliticians = [...politicians].sort((a, b) => {
    if (sort === 'alphabetical') {
      return a.full_name.localeCompare(b.full_name)
    }

    return b.trade_count - a.trade_count || a.full_name.localeCompare(b.full_name)
  })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Directory</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Politicians</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Search members of Congress by name, party, and chamber to inspect their trade activity.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <form action="/politicians" className="flex flex-col gap-3 sm:flex-row">
            <Input name="q" defaultValue={q} placeholder="Search by politician name" className="sm:max-w-sm" />
            <input type="hidden" name="chamber" value={chamber === 'All' ? '' : chamber} />
            <input type="hidden" name="party" value={party === 'All' ? '' : party} />
            <input type="hidden" name="sort" value={sort} />
            <Button type="submit">Search</Button>
          </form>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {chamberOptions.map((option) => (
                <Button key={option} asChild variant={chamber === option ? 'default' : 'outline'} size="sm">
                  <Link href={buildFilterHref({ q, chamber: option, party, sort })}>{option}</Link>
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {partyOptions.map((option) => (
                <Button key={option} asChild variant={party === option ? 'default' : 'outline'} size="sm">
                  <Link href={buildFilterHref({ q, chamber, party: option, sort })}>{option}</Link>
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant={sort === 'most-trades' ? 'default' : 'outline'} size="sm">
                <Link href={buildFilterHref({ q, chamber, party, sort: 'most-trades' })}>Most trades</Link>
              </Button>
              <Button asChild variant={sort === 'alphabetical' ? 'default' : 'outline'} size="sm">
                <Link href={buildFilterHref({ q, chamber, party, sort: 'alphabetical' })}>Alphabetical</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {sortedPoliticians.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center">
          <h3 className="text-base font-medium text-foreground">No politicians matched your filters</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a broader search or clear the current party and chamber filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedPoliticians.map((politician) => (
            <PoliticianCard key={politician.id} politician={politician} />
          ))}
        </div>
      )}
    </div>
  )
}
