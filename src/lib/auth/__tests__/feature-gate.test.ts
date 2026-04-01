import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { createServiceClient } from '@/lib/supabase/service'
import { getTradesDateFilter, requirePremium } from '@/lib/auth/feature-gate'

const mockCreateServiceClient = vi.mocked(createServiceClient)

function createSupabaseMock({ isPremium }: { isPremium: boolean }) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { is_premium: isPremium }, error: null })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })

  return {
    from: vi.fn().mockImplementation(() => ({
      select,
    })),
  }
}

describe('feature gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws for free users', async () => {
    mockCreateServiceClient.mockReturnValue(createSupabaseMock({ isPremium: false }) as never)

    await expect(requirePremium('user-1')).rejects.toThrow('Forbidden')
  })

  it('returns null date filter for premium users', async () => {
    mockCreateServiceClient.mockReturnValue(createSupabaseMock({ isPremium: true }) as never)

    const result = await getTradesDateFilter('user-1')

    expect(result).toBeNull()
  })

  it('returns 30-day filter for free users', async () => {
    mockCreateServiceClient.mockReturnValue(createSupabaseMock({ isPremium: false }) as never)

    const result = await getTradesDateFilter('user-1')

    expect(result).not.toBeNull()
    expect(result?.from).toBeInstanceOf(Date)
  })
})
