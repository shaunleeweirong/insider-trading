import { createServiceClient } from '@/lib/supabase/service'
import {
  getStripe,
  mapStripeSubscriptionStatus,
} from '@/lib/stripe/client'

export async function syncSubscriptionFromStripe(stripeSubscriptionId: string) {
  const stripe = getStripe()
  const supabase = createServiceClient()
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null
  const status = mapStripeSubscriptionStatus(subscription.status)
  const isPremium = status === 'active' || status === 'trialing' || status === 'past_due'

  await supabase
    .from('subscriptions')
    .update({ status })
    .eq('stripe_subscription_id', subscription.id)

  if (customerId) {
    await supabase
      .from('profiles')
      .update({ is_premium: isPremium })
      .eq('stripe_customer_id', customerId)
  }
}

export async function isUserPremium(userId: string) {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .maybeSingle()

  return profile?.is_premium ?? false
}
