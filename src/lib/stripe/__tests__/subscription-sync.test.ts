import { beforeEach, describe, expect, it, vi } from 'vitest'

const stripeSyncMocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/stripe/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/stripe/client')>('@/lib/stripe/client')

  return {
    ...actual,
    getStripe: () => ({
      subscriptions: {
        retrieve: stripeSyncMocks.retrieve,
      },
    }),
  }
})

import { createServiceClient } from '@/lib/supabase/service'
import { isUserPremium, syncSubscriptionFromStripe } from '@/lib/stripe/subscription-sync'

const mockCreateServiceClient = vi.mocked(createServiceClient)

function createSupabaseMock({ isPremium = false } = {}) {
  const profilesMaybeSingle = vi.fn().mockResolvedValue({ data: { is_premium: isPremium }, error: null })
  const profilesSelectEq = vi.fn().mockReturnValue({ maybeSingle: profilesMaybeSingle })
  const profilesSelect = vi.fn().mockReturnValue({ eq: profilesSelectEq })
  const profilesUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const profilesUpdate = vi.fn().mockReturnValue({ eq: profilesUpdateEq })

  const subscriptionsUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const subscriptionsUpdate = vi.fn().mockReturnValue({ eq: subscriptionsUpdateEq })

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: profilesSelect,
          update: profilesUpdate,
        }
      }

      if (table === 'subscriptions') {
        return {
          update: subscriptionsUpdate,
        }
      }

      return {}
    }),
    _profiles: {
      update: profilesUpdate,
      updateEq: profilesUpdateEq,
    },
    _subscriptions: {
      update: subscriptionsUpdate,
      updateEq: subscriptionsUpdateEq,
    },
  }
}

describe('subscription sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('syncs stripe subscription state to local records', async () => {
    const supabase = createSupabaseMock()
    mockCreateServiceClient.mockReturnValue(supabase as never)
    stripeSyncMocks.retrieve.mockResolvedValue({
      id: 'sub_123',
      customer: 'cus_123',
      status: 'past_due',
    })

    await syncSubscriptionFromStripe('sub_123')

    expect(supabase._subscriptions.update).toHaveBeenCalledWith({ status: 'past_due' })
    expect(supabase._profiles.update).toHaveBeenCalledWith({ is_premium: true })
  })

  it('returns premium state from cached profile flag', async () => {
    const supabase = createSupabaseMock({ isPremium: true })
    mockCreateServiceClient.mockReturnValue(supabase as never)

    const result = await isUserPremium('user-1')

    expect(result).toBe(true)
  })
})
