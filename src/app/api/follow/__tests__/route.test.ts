import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { DELETE, POST } from '@/app/api/follow/route'

const mockCreateClient = vi.mocked(createClient)

function createSupabaseMock({
  user,
  isPremium,
  insertError = null,
  deleteCount = 1,
}: {
  user: { id: string } | null
  isPremium: boolean
  insertError?: { code?: string; message?: string } | null
  deleteCount?: number
}) {
  const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { is_premium: isPremium }, error: null })
  const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
  const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

  const insert = vi.fn().mockResolvedValue({ error: insertError })
  const deleteEqSecond = vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: Array.from({ length: deleteCount }, () => ({ id: 'row' })), error: null }) })
  const deleteEqFirst = vi.fn().mockReturnValue({ eq: deleteEqSecond })
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEqFirst })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: profileSelect,
        }
      }

      if (table === 'followed_politicians') {
        return {
          insert,
          delete: deleteFn,
        }
      }

      return {}
    }),
  }
}

describe('follow route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseMock({ user: null, isPremium: false }) as never)

    const response = await POST(
      new Request('https://example.com/api/follow', {
        method: 'POST',
        body: JSON.stringify({ politician_id: 'pol-1' }),
      }),
    )

    expect(response.status).toBe(401)
  })

  it('returns 403 for free users', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseMock({ user: { id: 'user-1' }, isPremium: false }) as never)

    const response = await POST(
      new Request('https://example.com/api/follow', {
        method: 'POST',
        body: JSON.stringify({ politician_id: 'pol-1' }),
      }),
    )

    expect(response.status).toBe(403)
  })

  it('returns 200 for successful follows', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseMock({ user: { id: 'user-1' }, isPremium: true }) as never)

    const response = await POST(
      new Request('https://example.com/api/follow', {
        method: 'POST',
        body: JSON.stringify({ politician_id: 'pol-1' }),
      }),
    )

    expect(response.status).toBe(200)
  })

  it('returns 409 if already following', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        isPremium: true,
        insertError: { code: '23505', message: 'duplicate key value violates unique constraint' },
      }) as never,
    )

    const response = await POST(
      new Request('https://example.com/api/follow', {
        method: 'POST',
        body: JSON.stringify({ politician_id: 'pol-1' }),
      }),
    )

    expect(response.status).toBe(409)
  })

  it('returns 404 when unfollow target is missing', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({ user: { id: 'user-1' }, isPremium: true, deleteCount: 0 }) as never,
    )

    const response = await DELETE(
      new Request('https://example.com/api/follow', {
        method: 'DELETE',
        body: JSON.stringify({ politician_id: 'pol-1' }),
      }),
    )

    expect(response.status).toBe(404)
  })
})
