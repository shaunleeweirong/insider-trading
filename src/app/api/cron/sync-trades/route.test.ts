import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({ CRON_SECRET: 'cron-secret' }),
}))

vi.mock('@/lib/sync/trade-sync', () => ({
  syncTrades: vi.fn(),
}))

import { syncTrades } from '@/lib/sync/trade-sync'
import { POST } from './route'

const mockSyncTrades = vi.mocked(syncTrades)

describe('POST /api/cron/sync-trades', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthorized requests', async () => {
    const request = new Request('https://example.com/api/cron/sync-trades', {
      method: 'POST',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(mockSyncTrades).not.toHaveBeenCalled()
  })

  it('returns sync results for authorized requests', async () => {
    mockSyncTrades
      .mockResolvedValueOnce({ status: 'completed', tradesFetched: 2, tradesInserted: 2, tradesSkipped: 0, errorMessage: null })
      .mockResolvedValueOnce({ status: 'completed', tradesFetched: 1, tradesInserted: 1, tradesSkipped: 0, errorMessage: null })

    const request = new Request('https://example.com/api/cron/sync-trades', {
      method: 'POST',
      headers: {
        authorization: 'Bearer cron-secret',
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      senate: { status: 'completed', tradesFetched: 2, tradesInserted: 2, tradesSkipped: 0, errorMessage: null },
      house: { status: 'completed', tradesFetched: 1, tradesInserted: 1, tradesSkipped: 0, errorMessage: null },
    })
  })

  it('runs senate then house sequentially', async () => {
    const calls: string[] = []

    mockSyncTrades.mockImplementation(async (source) => {
      calls.push(source)

      return {
        status: 'completed',
        tradesFetched: 0,
        tradesInserted: 0,
        tradesSkipped: 0,
        errorMessage: null,
      }
    })

    const request = new Request('https://example.com/api/cron/sync-trades', {
      method: 'POST',
      headers: {
        authorization: 'Bearer cron-secret',
      },
    })

    await POST(request)

    expect(calls).toEqual(['senate', 'house'])
  })

  it('returns 500 when sync throws', async () => {
    mockSyncTrades.mockRejectedValue(new Error('sync failed'))

    const request = new Request('https://example.com/api/cron/sync-trades', {
      method: 'POST',
      headers: {
        authorization: 'Bearer cron-secret',
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'sync failed' })
  })
})
