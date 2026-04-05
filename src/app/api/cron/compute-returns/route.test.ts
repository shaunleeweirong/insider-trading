import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({ CRON_SECRET: 'cron-secret' }),
}))

vi.mock('@/lib/returns/compute-returns', () => ({
  computeAllReturns: vi.fn(),
}))

import { computeAllReturns } from '@/lib/returns/compute-returns'
import { GET } from './route'

const mockComputeAllReturns = vi.mocked(computeAllReturns)

describe('GET /api/cron/compute-returns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthorized requests', async () => {
    const request = new Request('https://example.com/api/cron/compute-returns')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(mockComputeAllReturns).not.toHaveBeenCalled()
  })

  it('returns computation results for authorized requests', async () => {
    mockComputeAllReturns.mockResolvedValue({ processed: 10, skipped: 2, errors: 0 })

    const request = new Request('https://example.com/api/cron/compute-returns', {
      headers: {
        authorization: 'Bearer cron-secret',
      },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ processed: 10, skipped: 2, errors: 0 })
  })

  it('returns 500 when computation throws', async () => {
    mockComputeAllReturns.mockRejectedValue(new Error('compute failed'))

    const request = new Request('https://example.com/api/cron/compute-returns', {
      headers: {
        authorization: 'Bearer cron-secret',
      },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'compute failed' })
  })
})
