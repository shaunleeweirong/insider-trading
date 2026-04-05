import { computeAllReturns } from '@/lib/returns/compute-returns'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

async function handlePost(_request: Request) {
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

  const result = await computeAllReturns()

  return Response.json({ success: true, message: 'Returns computation triggered', result })
}

export const POST = withRateLimit(handlePost)
