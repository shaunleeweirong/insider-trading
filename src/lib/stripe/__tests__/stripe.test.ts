import { beforeEach, describe, expect, it, vi } from 'vitest'

const stripeMocks = vi.hoisted(() => ({
  mockCheckoutCreate: vi.fn(),
  mockPortalCreate: vi.fn(),
  mockSubscriptionRetrieve: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_123',
    STRIPE_PRICE_ID: 'price_123',
  }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('stripe', () => {
  return {
    default: class Stripe {
      checkout = {
        sessions: {
          create: stripeMocks.mockCheckoutCreate,
        },
      }

      billingPortal = {
        sessions: {
          create: stripeMocks.mockPortalCreate,
        },
      }

      subscriptions = {
        retrieve: stripeMocks.mockSubscriptionRetrieve,
      }
    },
  }
})

import { createServiceClient } from '@/lib/supabase/service'
import {
  createCheckoutSession,
  createPortalSession,
  syncStripeSubscription,
  updateSubscriptionStatus,
} from '@/lib/stripe/client'

const mockCreateServiceClient = vi.mocked(createServiceClient)

function createSupabaseMock() {
  const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { email: 'user@example.com', stripe_customer_id: null }, error: null })
  const profilesSelectEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
  const profilesSelect = vi.fn().mockReturnValue({ eq: profilesSelectEq })
  const profilesUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const profilesUpdate = vi.fn().mockReturnValue({ eq: profilesUpdateEq })

  const subscriptionsUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
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
          upsert: subscriptionsUpsert,
          update: subscriptionsUpdate,
        }
      }

      return {}
    }),
    _profiles: {
      select: profilesSelect,
      update: profilesUpdate,
      updateEq: profilesUpdateEq,
      maybeSingle: profileMaybeSingle,
    },
    _subscriptions: {
      upsert: subscriptionsUpsert,
      update: subscriptionsUpdate,
      updateEq: subscriptionsUpdateEq,
    },
  }
}

describe('stripe client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
  })

  it('creates a checkout session URL', async () => {
    const supabase = createSupabaseMock()
    mockCreateServiceClient.mockReturnValue(supabase as never)
    stripeMocks.mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.test/session' })

    const url = await createCheckoutSession('user-1', 'price_123')

    expect(url).toBe('https://checkout.stripe.test/session')
    expect(stripeMocks.mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: 'user-1',
        success_url: 'https://example.com/settings/billing?success=true',
        cancel_url: 'https://example.com/pricing',
      }),
    )
  })

  it('creates a billing portal session URL', async () => {
    stripeMocks.mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.test/portal' })

    const url = await createPortalSession('cus_123')

    expect(url).toBe('https://billing.stripe.test/portal')
    expect(stripeMocks.mockPortalCreate).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'https://example.com/settings/billing',
    })
  })

  it('syncs an active subscription and enables premium', async () => {
    const supabase = createSupabaseMock()
    mockCreateServiceClient.mockReturnValue(supabase as never)
    stripeMocks.mockSubscriptionRetrieve.mockResolvedValue({
      id: 'sub_123',
      status: 'active',
      items: { data: [{ price: { id: 'price_123' } }] },
      current_period_start: 1_700_000_000,
      current_period_end: 1_700_086_400,
      cancel_at_period_end: false,
    })

    await syncStripeSubscription({
      stripeSubscriptionId: 'sub_123',
      userId: 'user-1',
      customerId: 'cus_123',
    })

    expect(supabase._subscriptions.upsert).toHaveBeenCalled()
    expect(supabase._profiles.update).toHaveBeenCalled()
    expect(supabase._profiles.updateEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('marks canceled subscriptions as non-premium', async () => {
    const supabase = createSupabaseMock()
    mockCreateServiceClient.mockReturnValue(supabase as never)

    await updateSubscriptionStatus({
      stripeSubscriptionId: 'sub_123',
      status: 'canceled',
      customerId: 'cus_123',
    })

    expect(supabase._subscriptions.update).toHaveBeenCalledWith({ status: 'canceled' })
    expect(supabase._profiles.update).toHaveBeenCalledWith({ is_premium: false })
  })
})
