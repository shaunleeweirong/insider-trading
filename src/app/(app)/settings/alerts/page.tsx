import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/server'
import { PoliticianCard, type PoliticianCardItem } from '@/components/politicians/politician-card'
import { UnfollowButton } from '@/app/(app)/settings/alerts/unfollow-button'

type AlertsPageProps = {
  searchParams: Promise<{ q?: string }>
}

type FollowRow = {
  politician_id: string
  politicians:
    | {
        id: string
        full_name: string
        party: PoliticianCardItem['party']
        chamber: PoliticianCardItem['chamber']
        state: string | null
        image_url: string | null
      }
    | {
        id: string
        full_name: string
        party: PoliticianCardItem['party']
        chamber: PoliticianCardItem['chamber']
        state: string | null
        image_url: string | null
      }[]
    | null
}

function toPolitician(row: FollowRow) {
  if (Array.isArray(row.politicians)) {
    return row.politicians[0] ?? null
  }

  return row.politicians
}

export default async function AlertsSettingsPage({ searchParams }: AlertsPageProps) {
  const { q = '' } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground">Log in to manage your alerts.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .maybeSingle()

  const isPremium = profile?.is_premium ?? false

  const { data: follows } = await supabase
    .from('followed_politicians')
    .select('politician_id, politicians(id, full_name, party, chamber, state, image_url)')
    .eq('user_id', user.id)

  let politicianQuery = supabase
    .from('politicians')
    .select('id, full_name, party, chamber, state, image_url')
    .order('full_name', { ascending: true })
    .limit(12)

  if (q) {
    politicianQuery = politicianQuery.ilike('full_name', `%${q}%`)
  }

  const { data: searchResults } = await politicianQuery

  const followItems = ((follows ?? []) as FollowRow[])
    .map((row) => {
      const politician = toPolitician(row)
      if (!politician) return null

      return {
        ...politician,
        trade_count: 0,
      }
    })
    .filter((item): item is PoliticianCardItem => item !== null)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Alerts</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Politician alerts</h1>
        <p className="text-sm text-muted-foreground">
          Follow politicians to receive email alerts when new trades are synced.
        </p>
      </div>

      {!isPremium ? (
        <div className="rounded-xl border border-border bg-background p-6">
          <h2 className="text-lg font-medium text-foreground">Premium required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Alerts are available on Premium only.
          </p>
          <Button asChild className="mt-4">
            <Link href="/pricing">Upgrade to Premium</Link>
          </Button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-background p-4 sm:p-6">
        <form action="/settings/alerts" className="flex flex-col gap-3 sm:flex-row">
          <Input name="q" defaultValue={q} placeholder="Search politicians to follow" className="sm:max-w-sm" />
          <Button type="submit">Search</Button>
        </form>
        {isPremium ? (
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {(searchResults ?? []).map((politician: { id: string; full_name: string }) => (
              <Link
                key={politician.id}
                href={`/politicians/${politician.id}`}
                className="rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                {politician.full_name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {followItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center">
          <h3 className="text-base font-medium text-foreground">You&apos;re not following any politicians yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse politicians and follow the ones you want to monitor.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/politicians">Browse politicians</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {followItems.map((politician) => (
            <div key={politician.id} className="space-y-3">
              <PoliticianCard politician={politician} />
              {isPremium ? <UnfollowButton politicianId={politician.id} /> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
