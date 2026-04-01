import { describe, expect, it } from 'vitest'
import { clientSchema, serverSchema, parseClientEnv, parseServerEnv } from '../env'

const VALID_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
  NEXT_PUBLIC_APP_URL: 'https://example.com',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  FMP_API_KEY: 'fmp-key',
  CRON_SECRET: 'cron-secret',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_123',
  STRIPE_PRICE_ID: 'price_123',
  RESEND_API_KEY: 're_123',
  RESEND_FROM_EMAIL: 'alerts@example.com',
} satisfies Record<string, string>

describe('env validation', () => {
  it('parses valid server and client env vars', () => {
    const server = serverSchema.parse(VALID_ENV)
    const client = clientSchema.parse(VALID_ENV)

    expect(client.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    expect(client.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBe(
      VALID_ENV.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    )
    expect(server.STRIPE_SECRET_KEY).toBe(VALID_ENV.STRIPE_SECRET_KEY)
    expect(server.RESEND_API_KEY).toBe(VALID_ENV.RESEND_API_KEY)
  })

  it('rejects missing required env vars', () => {
    expect(() => serverSchema.parse({})).toThrow()
    expect(() => clientSchema.parse({})).toThrow()
  })

  it('rejects invalid prefixes', () => {
    expect(() =>
      serverSchema.parse({
        ...VALID_ENV,
        STRIPE_SECRET_KEY: 'pk_test_wrong_prefix',
      }),
    ).toThrow()

    expect(() =>
      clientSchema.parse({
        ...VALID_ENV,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'sk_test_wrong_prefix',
      }),
    ).toThrow()
  })

  it('keeps client and server schemas separated', () => {
    const clientOnly = {
      NEXT_PUBLIC_SUPABASE_URL: VALID_ENV.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: VALID_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: VALID_ENV.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_APP_URL: VALID_ENV.NEXT_PUBLIC_APP_URL,
    }
    expect(() => clientSchema.parse(clientOnly)).not.toThrow()

    const serverOnly = {
      SUPABASE_SERVICE_ROLE_KEY: VALID_ENV.SUPABASE_SERVICE_ROLE_KEY,
      FMP_API_KEY: VALID_ENV.FMP_API_KEY,
      CRON_SECRET: VALID_ENV.CRON_SECRET,
      STRIPE_SECRET_KEY: VALID_ENV.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: VALID_ENV.STRIPE_WEBHOOK_SECRET,
      STRIPE_PRICE_ID: VALID_ENV.STRIPE_PRICE_ID,
      RESEND_API_KEY: VALID_ENV.RESEND_API_KEY,
      RESEND_FROM_EMAIL: VALID_ENV.RESEND_FROM_EMAIL,
    }
    expect(() => serverSchema.parse(serverOnly)).not.toThrow()
  })

  it('parseServerEnv and parseClientEnv use process.env', () => {
    const originalEnv = process.env
    process.env = { ...originalEnv, ...VALID_ENV }

    expect(() => parseServerEnv()).not.toThrow()
    expect(() => parseClientEnv()).not.toThrow()

    process.env = originalEnv
  })
})
