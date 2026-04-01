import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { getServerEnv } from '@/lib/env'
import {
  getStripe,
  mapStripeSubscriptionStatus,
  syncStripeSubscription,
  updateSubscriptionStatus,
} from '@/lib/stripe/client'

export const runtime = 'nodejs'

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
  const customerId = typeof session.customer === 'string' ? session.customer : null

  if (!userId || !subscriptionId) {
    return
  }

  await syncStripeSubscription({
    stripeSubscriptionId: subscriptionId,
    userId,
    customerId,
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null

  await updateSubscriptionStatus({
    stripeSubscriptionId: subscription.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    customerId,
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null

  await updateSubscriptionStatus({
    stripeSubscriptionId: subscription.id,
    status: 'canceled',
    customerId,
  })
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const rawInvoice = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
  const subscriptionId = typeof rawInvoice.subscription === 'string' ? rawInvoice.subscription : null
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : null

  if (!subscriptionId) {
    return
  }

  await updateSubscriptionStatus({
    stripeSubscriptionId: subscriptionId,
    status: 'past_due',
    customerId,
  })
}

export async function POST(request: Request) {
  const stripe = getStripe()
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getServerEnv().STRIPE_WEBHOOK_SECRET,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature'
    return Response.json({ error: message }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
      break
    default:
      break
  }

  return Response.json({ received: true })
}
