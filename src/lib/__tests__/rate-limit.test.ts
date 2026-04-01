import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  slidingWindow: vi.fn(() => 'sliding-window-config'),
}))

vi.mock('@upstash/redis', () => ({
  Redis: class Redis {},
}))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class MockRatelimit {
    static slidingWindow = mocks.slidingWindow

    constructor() {}

    limit(identifier: string) {
      return mocks.limit(identifier)
    }
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { RATE_LIMIT_TIERS, limitByTier } from '@/lib/rate-limit'
import {
  createRateLimitResponse,
  getRateLimitContext,
} from '@/lib/middleware/rate-limit'

const mockCreateClient = vi.mocked(createClient)

function createSupabaseMock({
  user,
  isPremium,
}: {
  user: { id: string } | null
  isPremium: boolean
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { is_premium: isPremium },
            error: null,
          }),
        }),
      }),
    })),
  }
}

describe('rate limit utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  })

  it('defines anonymous limit as 20 per minute', () => {
    expect(RATE_LIMIT_TIERS.anonymous.requests).toBe(20)
  })

  it('defines free limit as 60 per minute', () => {
    expect(RATE_LIMIT_TIERS.free.requests).toBe(60)
  })

  it('defines premium limit as 200 per minute', () => {
    expect(RATE_LIMIT_TIERS.premium.requests).toBe(200)
  })

  it('uses IP fallback for anonymous users', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({ user: null, isPremium: false }) as never,
    )

    const context = await getRateLimitContext(
      new Request('https://example.com/api/export/trades', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      }),
    )

    expect(context).toEqual({ tier: 'anonymous', identifier: 'ip:1.2.3.4' })
  })

  it('uses premium tier for premium users', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({ user: { id: 'user-1' }, isPremium: true }) as never,
    )

    const context = await getRateLimitContext(
      new Request('https://example.com/api/export/trades'),
    )

    expect(context).toEqual({ tier: 'premium', identifier: 'user:user-1' })
  })

  it('returns 429 response with retry-after header', () => {
    const response = createRateLimitResponse(Date.now() + 3000)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
  })

  it('calls the limiter with the provided identifier', async () => {
    mocks.limit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60000,
    })

    await limitByTier({ tier: 'anonymous', identifier: 'ip:1.2.3.4' })

    expect(mocks.limit).toHaveBeenCalledWith('ip:1.2.3.4')
  })
})
