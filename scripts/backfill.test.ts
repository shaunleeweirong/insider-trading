import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { createServiceClient } from '../src/lib/supabase/service'
import { runBackfill } from './backfill'

const mockCreateServiceClient = vi.mocked(createServiceClient)

function createMockSupabase() {
  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'backfill-run' }, error: null }),
    }),
  })
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  })
  const from = vi.fn().mockImplementation(() => ({
    insert,
    update,
  }))

  return {
    from,
    _insert: insert,
    _update: update,
  }
}

describe('runBackfill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stops pagination after an empty page and aggregates counts', async () => {
    const supabase = createMockSupabase()
    mockCreateServiceClient.mockReturnValue(supabase as never)

    const log = vi.fn()
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'a' }])
      .mockResolvedValueOnce([{ id: 'b' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'c' }])
      .mockResolvedValueOnce([])
    const processBatch = vi
      .fn()
      .mockResolvedValueOnce({ tradesFetched: 1, tradesInserted: 1, tradesSkipped: 0, insertedTrades: [] })
      .mockResolvedValueOnce({ tradesFetched: 1, tradesInserted: 0, tradesSkipped: 1, insertedTrades: [] })
      .mockResolvedValueOnce({ tradesFetched: 1, tradesInserted: 1, tradesSkipped: 0, insertedTrades: [] })

    const result = await runBackfill({
      fetchPage: fetchPage as never,
      processBatch: processBatch as never,
      log,
      delay: 0,
    })

    expect(result).toEqual({
      status: 'completed',
      tradesFetched: 3,
      tradesInserted: 2,
      tradesSkipped: 1,
      insertedTrades: [],
      errorMessage: null,
    })
    expect(fetchPage).toHaveBeenCalledWith('senate', 0)
    expect(fetchPage).toHaveBeenCalledWith('senate', 1)
    expect(fetchPage).toHaveBeenCalledWith('senate', 2)
    expect(fetchPage).toHaveBeenCalledWith('house', 0)
    expect(fetchPage).toHaveBeenCalledWith('house', 1)
    expect(processBatch).toHaveBeenCalledTimes(3)
    expect(log).toHaveBeenCalledTimes(5)
  })

  it('waits between pages to avoid rate limiting', async () => {
    vi.useFakeTimers()

    const supabase = createMockSupabase()
    mockCreateServiceClient.mockReturnValue(supabase as never)

    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'a' }])
      .mockResolvedValueOnce([{ id: 'b' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    const processBatch = vi
      .fn()
      .mockResolvedValueOnce({ tradesFetched: 1, tradesInserted: 1, tradesSkipped: 0, insertedTrades: [] })
      .mockResolvedValueOnce({ tradesFetched: 1, tradesInserted: 1, tradesSkipped: 0, insertedTrades: [] })

    const resultPromise = runBackfill({
      fetchPage: fetchPage as never,
      processBatch: processBatch as never,
      log: vi.fn(),
      delay: 300,
    })

    await vi.runAllTimersAsync()

    await expect(resultPromise).resolves.toMatchObject({
      status: 'completed',
      tradesFetched: 2,
      tradesInserted: 2,
      tradesSkipped: 0,
    })
    expect(fetchPage).toHaveBeenCalledTimes(4)
  })

  it('treats a terminal FMP 400 as end of pagination', async () => {
    const supabase = createMockSupabase()
    mockCreateServiceClient.mockReturnValue(supabase as never)

    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'a' }])
      .mockRejectedValueOnce(new Error('FMP API error: 400'))
      .mockRejectedValueOnce(new Error('FMP API error: 400'))
    const processBatch = vi
      .fn()
      .mockResolvedValueOnce({ tradesFetched: 1, tradesInserted: 1, tradesSkipped: 0, insertedTrades: [] })
    const log = vi.fn()

    const result = await runBackfill({
      fetchPage: fetchPage as never,
      processBatch: processBatch as never,
      log,
      delay: 0,
    })

    expect(result).toEqual({
      status: 'completed',
      tradesFetched: 1,
      tradesInserted: 1,
      tradesSkipped: 0,
      insertedTrades: [],
      errorMessage: null,
    })
    expect(processBatch).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(log).toHaveBeenCalledWith(
      'Completed senate backfill: fetched 1 trades, inserted 1, skipped 0. Running total: fetched 1, inserted 1, skipped 0'
    )
    expect(log).toHaveBeenCalledWith(
      'Completed house backfill: fetched 0 trades, inserted 0, skipped 0. Running total: fetched 1, inserted 1, skipped 0'
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
