import { getServerEnv } from '@/lib/env'
import { createCheckoutSession } from '@/lib/stripe/client'
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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle()

  if (subscription) {
    return Response.json({ error: 'Already subscribed' }, { status: 400 })
  }

  const url = await createCheckoutSession(user.id, getServerEnv().STRIPE_PRICE_ID)

  return Response.json({ url })
}
