import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rlsSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/003_rls_policies.sql'),
  'utf8',
)

describe('RLS policy migration', () => {
  it('enables row level security for all 7 application tables', () => {
    expect(rlsSql.match(/ENABLE ROW LEVEL SECURITY/g)?.length).toBe(7)
  })

  it('includes public read policies for public data tables', () => {
    expect(rlsSql).toContain('Anyone can view politicians')
    expect(rlsSql).toContain('Anyone can view trades')
    expect(rlsSql).toContain('Anyone can view stock prices')
  })

  it('includes owner-scoped policies for private user data', () => {
    expect(rlsSql).toContain('Users can view own profile')
    expect(rlsSql).toContain('Users can view own subscriptions')
    expect(rlsSql).toContain('Users can view own follows')
    expect(rlsSql).toContain('auth.uid() = id')
    expect(rlsSql).toContain('auth.uid() = user_id')
  })

  it('gives service_role management access on all tables', () => {
    expect(rlsSql.match(/auth\.role\(\) = 'service_role'/g)?.length).toBeGreaterThanOrEqual(7)
  })
})
