import { getStripe } from '../src/lib/stripe/client'

async function main() {
  const stripe = getStripe()

  const product = await stripe.products.create({
    name: 'Insider Trading Pro',
    description: 'Premium access to alerts, exports, and full congressional trade history.',
  })

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: 999,
    recurring: {
      interval: 'month',
    },
  })

  await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your CapitolTrades subscription',
    },
    features: {
      customer_update: {
        allowed_updates: ['email', 'address'],
        enabled: true,
      },
      invoice_history: {
        enabled: true,
      },
      payment_method_update: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
      },
      subscription_update: {
        enabled: false,
        default_allowed_updates: [],
        products: [],
      },
    },
  })

  console.log('Stripe product created:', product.id)
  console.log('Stripe price created:', price.id)
  console.log('Set STRIPE_PRICE_ID to:', price.id)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
