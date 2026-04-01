import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/middleware/rate-limit'

async function handleGet() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('followed_politicians')
    .select('id, politician_id, politicians(id, full_name, party, chamber, state, image_url)')
    .eq('user_id', user.id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ follows: data ?? [] })
}

export const GET = withRateLimit(handleGet)
