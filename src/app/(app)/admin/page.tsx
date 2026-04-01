import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TriggerSyncButton } from '@/app/(app)/admin/trigger-sync-button'

type SyncRunRow = {
  id: string
  started_at: string
  completed_at: string | null
  source: string
  status: 'running' | 'completed' | 'failed'
  trades_fetched: number
  trades_inserted: number
  trades_skipped: number
  error_message: string | null
}

function formatDateTime(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDuration(startedAt: string, completedAt: string | null) {
  if (!completedAt) return 'Running'

  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  const minutes = Math.max(0, Math.round(durationMs / 1000 / 60))
  return `${minutes} min`
}

function getStatusClass(status: SyncRunRow['status']) {
  if (status === 'completed') return 'bg-trade-buy/15 text-trade-buy'
  if (status === 'failed') return 'bg-trade-sell/15 text-trade-sell'
  return 'bg-muted text-muted-foreground'
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    redirect('/dashboard')
  }

  const [{ data: syncRuns }, politicians, trades, users, premiumUsers] = await Promise.all([
    service
      .from('sync_runs')
      .select('id, started_at, completed_at, source, status, trades_fetched, trades_inserted, trades_skipped, error_message')
      .order('started_at', { ascending: false })
      .limit(10),
    service.from('politicians').select('*', { count: 'exact', head: true }),
    service.from('trades').select('*', { count: 'exact', head: true }),
    service.from('profiles').select('*', { count: 'exact', head: true }),
    service.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
  ])

  const runs = (syncRuns ?? []) as SyncRunRow[]
  const lastSuccessfulSync = runs.find((run) => run.status === 'completed')?.completed_at ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary">Admin</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Sync status dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Monitor pipeline health, user totals, and recent ingestion runs.
          </p>
        </div>
        <TriggerSyncButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Politicians</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{politicians.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trades</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{trades.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Users</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{users.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Premium Users</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{premiumUsers.count ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last successful sync</CardTitle>
          <CardDescription>{formatDateTime(lastSuccessfulSync)}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sync runs</CardTitle>
          <CardDescription>Latest pipeline executions across cron and admin-triggered runs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started At</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fetched</TableHead>
                <TableHead>Inserted</TableHead>
                <TableHead>Skipped</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{formatDateTime(run.started_at)}</TableCell>
                  <TableCell>{run.source}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusClass(run.status)}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{run.trades_fetched}</TableCell>
                  <TableCell>{run.trades_inserted}</TableCell>
                  <TableCell>{run.trades_skipped}</TableCell>
                  <TableCell>{formatDuration(run.started_at, run.completed_at)}</TableCell>
                  <TableCell className="max-w-[18rem] truncate text-muted-foreground">
                    {run.error_message ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
