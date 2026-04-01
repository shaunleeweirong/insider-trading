import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET } from './route'

const mockCreateClient = vi.mocked(createClient)

function createQueryBuilder(responseData: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: responseData, error: null }),
    then: vi.fn((resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: responseData, error: null })),
    ),
  }

  return builder
}

function createMockSupabase({
  user,
  profile,
  trades,
}: {
  user: { id: string } | null
  profile: { is_premium: boolean } | null
  trades: unknown[]
}) {
  const profileBuilder = createQueryBuilder(profile)
  const tradesBuilder = createQueryBuilder(trades)

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder
      if (table === 'trades') return tradesBuilder
      return createQueryBuilder([])
    }),
  }
}

describe('GET /api/export/trades', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated users', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ user: null, profile: null, trades: [] }) as never,
    )

    const response = await GET(new Request('https://example.com/api/export/trades'))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 for free users', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-1' },
        profile: { is_premium: false },
        trades: [],
      }) as never,
    )

    const response = await GET(new Request('https://example.com/api/export/trades'))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: 'Forbidden' })
  })

  it('returns CSV for premium users', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-1' },
        profile: { is_premium: true },
        trades: [
          {
            transaction_date: '2024-03-01',
            ticker: 'AAPL',
            asset_name: 'Apple Inc.',
            transaction_type: 'Purchase',
            amount_range_raw: '$1,001 - $15,000',
            politicians: {
              full_name: 'Nancy Pelosi',
              party: 'Democrat',
              chamber: 'House',
            },
          },
        ],
      }) as never,
    )

    const response = await GET(new Request('https://example.com/api/export/trades?ticker=AAPL'))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/csv')
    expect(response.headers.get('Content-Disposition')).toContain('trades-export.csv')
    expect(body).toContain('"Date","Politician","Party","Chamber","Ticker","Asset","Type","Amount Range"')
    expect(body).toContain('"Nancy Pelosi"')
    expect(body).toContain('"AAPL"')
  })
})
