import { createPortalSession } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'No Stripe customer on file' }, { status: 400 })
  }

  const url = await createPortalSession(profile.stripe_customer_id)

  return Response.json({ url })
}
