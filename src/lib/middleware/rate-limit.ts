import { createClient } from '@/lib/supabase/server'
import { limitByTier } from '@/lib/rate-limit'

type CachedTier = {
  tier: 'free' | 'premium'
  expiresAt: number
}

const tierCache = new Map<string, CachedTier>()

async function getTierForUser(userId: string) {
  const cached = tierCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tier
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .maybeSingle()

  const tier = profile?.is_premium ? 'premium' : 'free'
  tierCache.set(userId, {
    tier,
    expiresAt: Date.now() + 60_000,
  })

  return tier
}

function getIpIdentifier(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'anonymous'
  }

  return 'anonymous'
}

export async function getRateLimitContext(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      tier: 'anonymous' as const,
      identifier: `ip:${getIpIdentifier(request)}`,
    }
  }

  const tier = await getTierForUser(user.id)

  return {
    tier,
    identifier: `user:${user.id}`,
  }
}

export function createRateLimitResponse(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))

  return Response.json(
    { error: 'Too Many Requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    },
  )
}

export function withRateLimit<T extends unknown[]>(
  handler: (request: Request, ...args: T) => Promise<Response>,
) {
  return async (request: Request, ...args: T) => {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return handler(request, ...args)
    }

    const context = await getRateLimitContext(request)
    const result = await limitByTier(context)

    if (!result.success) {
      return createRateLimitResponse(result.reset)
    }

    return handler(request, ...args)
  }
}
