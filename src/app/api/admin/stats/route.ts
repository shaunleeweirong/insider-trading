import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withRateLimit } from '@/lib/middleware/rate-limit'

export const runtime = 'nodejs'

async function handleGet() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [politicians, trades, users, premiumUsers] = await Promise.all([
    service.from('politicians').select('*', { count: 'exact', head: true }),
    service.from('trades').select('*', { count: 'exact', head: true }),
    service.from('profiles').select('*', { count: 'exact', head: true }),
    service.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
  ])

  return Response.json({
    totalPoliticians: politicians.count ?? 0,
    totalTrades: trades.count ?? 0,
    totalUsers: users.count ?? 0,
    totalPremiumUsers: premiumUsers.count ?? 0,
  })
}

export const GET = withRateLimit(handleGet)
