import { syncTrades } from '@/lib/sync/trade-sync'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function POST() {
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

  const senate = await syncTrades('senate')
  const house = await syncTrades('house')

  return Response.json({ senate, house })
}
