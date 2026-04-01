import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const RATE_LIMIT_TIERS = {
  anonymous: { requests: 20, window: '60 s' },
  free: { requests: 60, window: '60 s' },
  premium: { requests: 200, window: '60 s' },
} as const

let redisInstance: Redis | null = null

function getRedis() {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }

  return redisInstance
}

export function createTierLimiter(tier: keyof typeof RATE_LIMIT_TIERS) {
  const config = RATE_LIMIT_TIERS[tier]

  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: `capitoltrades:${tier}`,
  })
}

export async function limitByTier({
  tier,
  identifier,
}: {
  tier: keyof typeof RATE_LIMIT_TIERS
  identifier: string
}) {
  return createTierLimiter(tier).limit(identifier)
}
