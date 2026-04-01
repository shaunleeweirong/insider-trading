import { beforeEach, describe, expect, it, vi } from 'vitest'

const resendMocks = vi.hoisted(() => ({
  send: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({
    RESEND_API_KEY: 're_123',
    RESEND_FROM_EMAIL: 'alerts@example.com',
  }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: class Resend {
    emails = {
      send: resendMocks.send,
    }
  },
}))

import { createServiceClient } from '@/lib/supabase/service'
import { composeTradeAlertEmail } from '@/lib/alerts/email-templates'
import { sendTradeAlerts } from '@/lib/alerts/alert-service'

const mockCreateServiceClient = vi.mocked(createServiceClient)

function createSupabaseMock() {
  const politiciansMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'pol-1',
      full_name: 'Nancy Pelosi',
      party: 'Democrat',
      chamber: 'House',
      state: 'CA',
      image_url: null,
      normalized_name: 'nancy pelosi',
      first_name: 'Nancy',
      last_name: 'Pelosi',
      district: null,
      bioguide_id: null,
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    error: null,
  })
  const politiciansEq = vi.fn().mockReturnValue({ maybeSingle: politiciansMaybeSingle })
  const politiciansSelect = vi.fn().mockReturnValue({ eq: politiciansEq })

  const followersEq = vi.fn().mockResolvedValue({
    data: [{ user_id: 'user-1' }, { user_id: 'user-1' }, { user_id: 'user-2' }],
    error: null,
  })
  const followersSelect = vi.fn().mockReturnValue({ eq: followersEq })

  const profilesMaybeSingle = vi
    .fn()
    .mockResolvedValueOnce({
      data: {
        id: 'user-1',
        email: 'premium@example.com',
        display_name: 'Premium User',
        is_premium: true,
        is_admin: false,
        stripe_customer_id: null,
        created_at: '',
        updated_at: '',
      },
      error: null,
    })
    .mockResolvedValueOnce({
      data: {
        id: 'user-2',
        email: 'free@example.com',
        display_name: 'Free User',
        is_premium: false,
        is_admin: false,
        stripe_customer_id: null,
        created_at: '',
        updated_at: '',
      },
      error: null,
    })
  const profilesEq = vi.fn().mockReturnValue({ maybeSingle: profilesMaybeSingle })
  const profilesSelect = vi.fn().mockReturnValue({ eq: profilesEq })

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'politicians') {
        return { select: politiciansSelect }
      }

      if (table === 'followed_politicians') {
        return { select: followersSelect }
      }

      if (table === 'profiles') {
        return { select: profilesSelect }
      }

      return {}
    }),
  }
}

describe('alert service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
  })

  it('sends alerts only to premium followers without duplicates', async () => {
    mockCreateServiceClient.mockReturnValue(createSupabaseMock() as never)
    resendMocks.send.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const result = await sendTradeAlerts([
      {
        id: 'trade-1',
        politician_id: 'pol-1',
        transaction_date: '2024-03-01',
        disclosure_date: null,
        ticker: 'AAPL',
        asset_name: 'Apple Inc.',
        asset_type: null,
        transaction_type: 'Purchase',
        amount_range_raw: '$1,001 - $15,000',
        amount_min: 1001,
        amount_max: 15000,
        comment: null,
        source: 'fmp',
        created_at: '',
      },
    ])

    expect(result).toEqual({ sent: 1, failed: 0 })
    expect(resendMocks.send).toHaveBeenCalledTimes(1)
  })

  it('builds alert email subject and html with politician link', () => {
    const email = composeTradeAlertEmail(
      {
        id: 'user-1',
        email: 'user@example.com',
        display_name: 'User',
        is_premium: true,
        is_admin: false,
        stripe_customer_id: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'pol-1',
        full_name: 'Nancy Pelosi',
        normalized_name: 'nancy pelosi',
        first_name: 'Nancy',
        last_name: 'Pelosi',
        party: 'Democrat',
        chamber: 'House',
        state: 'CA',
        district: null,
        bioguide_id: null,
        image_url: null,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'trade-1',
        politician_id: 'pol-1',
        transaction_date: '2024-03-01',
        disclosure_date: null,
        ticker: 'AAPL',
        asset_name: 'Apple Inc.',
        asset_type: null,
        transaction_type: 'Purchase',
        amount_range_raw: '$1,001 - $15,000',
        amount_min: 1001,
        amount_max: 15000,
        comment: null,
        source: 'fmp',
        created_at: '',
      },
    )

    expect(email.subject).toContain('Nancy Pelosi')
    expect(email.subject).toContain('buy')
    expect(email.html).toContain('Apple Inc.')
    expect(email.html).toContain('/politicians/pol-1')
  })
})
