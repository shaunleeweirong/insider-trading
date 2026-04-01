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
    expect(log).toHaveBeenCalledTimes(3)
  })
})
