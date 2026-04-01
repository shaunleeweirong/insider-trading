import Stripe from 'stripe'
import { getServerEnv } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/service'
import type { SubscriptionStatus } from '@/types/database'

export function getStripe() {
  return new Stripe(getServerEnv().STRIPE_SECRET_KEY)
}

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'active') return 'active'
  if (status === 'canceled') return 'canceled'
  if (status === 'past_due') return 'past_due'
  if (status === 'trialing') return 'trialing'
  return 'incomplete'
}

export async function createCheckoutSession(userId: string, priceId: string) {
  const stripe = getStripe()
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()

  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL!}/settings/billing?success=true`
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL!}/pricing`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : profile?.email ?? undefined,
  })

  if (!session.url) {
    throw new Error('Stripe checkout session did not return a URL')
  }

  return session.url
}

export async function createPortalSession(customerId: string) {
  const stripe = getStripe()
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL!}/settings/billing`,
  })

  return portal.url
}

export async function syncStripeSubscription({
  stripeSubscriptionId,
  userId,
  customerId,
}: {
  stripeSubscriptionId: string
  userId: string
  customerId: string | null
}) {
  const stripe = getStripe()
  const supabase = createServiceClient()
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const subscriptionData = subscription as unknown as Stripe.Subscription
  const subscriptionItem = subscriptionData.items.data[0]
  const mappedStatus = mapStripeSubscriptionStatus(subscriptionData.status)
  const isPremium = mappedStatus === 'active' || mappedStatus === 'trialing'
  const subscriptionPeriods = subscriptionData as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }
  const currentPeriodStart = subscriptionPeriods.current_period_start ?? null
  const currentPeriodEnd = subscriptionPeriods.current_period_end ?? null

  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscriptionData.id,
      stripe_price_id: subscriptionItem?.price.id ?? null,
      status: mappedStatus,
      current_period_start:
        typeof currentPeriodStart === 'number'
          ? new Date(currentPeriodStart * 1000).toISOString()
          : null,
      current_period_end:
        typeof currentPeriodEnd === 'number'
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null,
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
    },
    { onConflict: 'stripe_subscription_id' },
  )

  await supabase
    .from('profiles')
    .update({
      is_premium: isPremium,
      stripe_customer_id: customerId,
    })
    .eq('id', userId)
}

export async function updateSubscriptionStatus({
  stripeSubscriptionId,
  status,
  customerId,
}: {
  stripeSubscriptionId: string
  status: SubscriptionStatus
  customerId: string | null
}) {
  const supabase = createServiceClient()
  const isPremium = status === 'active' || status === 'trialing' || status === 'past_due'

  await supabase
    .from('subscriptions')
    .update({
      status,
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)

  if (customerId) {
    await supabase
      .from('profiles')
      .update({
        is_premium: isPremium,
      })
      .eq('stripe_customer_id', customerId)
  }
}
