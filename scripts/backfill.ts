import { createServiceClient } from '../src/lib/supabase/service'
import {
  fetchTradePage,
  syncTradeBatch,
  type SyncCounts,
  type TradeSyncSource,
} from '../src/lib/sync/trade-sync'

type BackfillOptions = {
  fetchPage?: typeof fetchTradePage
  processBatch?: typeof syncTradeBatch
  createClient?: typeof createServiceClient
  log?: (message: string) => void
  delay?: number
}

type BackfillResult = SyncCounts & {
  status: 'completed' | 'failed'
  errorMessage: string | null
}

function isTerminalFmpPageError(error: unknown) {
  return error instanceof Error && error.message === 'FMP API error: 400'
}

async function runSourceBackfill({
  supabase,
  source,
  fetchPage,
  processBatch,
  log,
  delay,
}: {
  supabase: ReturnType<typeof createServiceClient>
  source: TradeSyncSource
  fetchPage: typeof fetchTradePage
  processBatch: typeof syncTradeBatch
  log: (message: string) => void
  delay: number
}): Promise<SyncCounts> {
  let page = 0
  let tradesFetched = 0
  let tradesInserted = 0
  let tradesSkipped = 0
  const insertedTrades: SyncCounts['insertedTrades'] = []

  while (true) {
    let records

    try {
      records = await fetchPage(source, page)
    } catch (error) {
      if (isTerminalFmpPageError(error)) {
        break
      }

      throw error
    }

    if (records.length === 0) {
      break
    }

    const counts = await processBatch({
      supabase,
      source,
      records,
    })

    tradesFetched += counts.tradesFetched
    tradesInserted += counts.tradesInserted
    tradesSkipped += counts.tradesSkipped
    insertedTrades.push(...counts.insertedTrades)

    log(
      `Fetched ${source} page ${page}, inserted ${counts.tradesInserted} trades, skipped ${counts.tradesSkipped} duplicates`
    )

    page += 1

    if (delay > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay)
      })
    }
  }

  return {
    tradesFetched,
    tradesInserted,
    tradesSkipped,
    insertedTrades,
  }
}

export async function runBackfill(options: BackfillOptions = {}): Promise<BackfillResult> {
  const fetchPage = options.fetchPage ?? fetchTradePage
  const processBatch = options.processBatch ?? syncTradeBatch
  const createClient = options.createClient ?? createServiceClient
  const log = options.log ?? console.log
  const delay = options.delay ?? 300
  const supabase = createClient()
  const startedAt = new Date().toISOString()

  let syncRunId: string | null = null
  let tradesFetched = 0
  let tradesInserted = 0
  let tradesSkipped = 0
  const insertedTrades: SyncCounts['insertedTrades'] = []

  try {
    const { data: syncRun } = await supabase
      .from('sync_runs')
      .insert({
        source: 'backfill',
        status: 'running',
        started_at: startedAt,
        trades_fetched: 0,
        trades_inserted: 0,
        trades_skipped: 0,
      })
      .select('id')
      .single()

    syncRunId = (syncRun as { id: string } | null)?.id ?? null

    for (const source of ['senate', 'house'] as const) {
      const counts = await runSourceBackfill({
        supabase,
        source,
        fetchPage,
        processBatch,
        log,
        delay,
      })

      tradesFetched += counts.tradesFetched
      tradesInserted += counts.tradesInserted
      tradesSkipped += counts.tradesSkipped
      insertedTrades.push(...counts.insertedTrades)

      log(
        `Completed ${source} backfill: fetched ${counts.tradesFetched} trades, inserted ${counts.tradesInserted}, skipped ${counts.tradesSkipped}. Running total: fetched ${tradesFetched}, inserted ${tradesInserted}, skipped ${tradesSkipped}`
      )
    }

    if (syncRunId) {
      await supabase
        .from('sync_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          trades_fetched: tradesFetched,
          trades_inserted: tradesInserted,
          trades_skipped: tradesSkipped,
        })
        .eq('id', syncRunId)
    }

    return {
      status: 'completed',
      tradesFetched,
      tradesInserted,
      tradesSkipped,
      insertedTrades,
      errorMessage: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (syncRunId) {
      await supabase
        .from('sync_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          trades_fetched: tradesFetched,
          trades_inserted: tradesInserted,
          trades_skipped: tradesSkipped,
          error_message: message,
        })
        .eq('id', syncRunId)
    }

    return {
      status: 'failed',
      tradesFetched,
      tradesInserted,
      tradesSkipped,
      insertedTrades,
      errorMessage: message,
    }
  }
}

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  process.argv[1].endsWith('scripts/backfill.ts')

if (isDirectRun) {
  const result = await runBackfill()

  if (result.status === 'failed') {
    process.exitCode = 1
  }
}
