import Link from 'next/link'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { PricingSuccessToast } from '@/app/(app)/pricing/success-toast'
import { CheckoutButton } from '@/app/(app)/pricing/checkout-button'

type PricingPageProps = {
  searchParams: Promise<{ success?: string }>
}

const freeFeatures = [
  'Last 30 days of trades',
  'Basic politician search',
  'Public trade data',
]

const premiumFeatures = [
  'Full trade history',
  'Email alerts for followed politicians',
  'CSV data export',
  'Performance charts',
]

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Compare Free and Premium plans for CapitolTrades.',
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { success } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isPremium = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .maybeSingle()

    isPremium = profile?.is_premium ?? false
  }

  return (
    <div className="space-y-8">
      <PricingSuccessToast show={success === 'true'} />
      <div className="space-y-2 text-center">
        <Badge variant="secondary">Pricing</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Choose your access level</h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Start free, then upgrade when you want full history, exports, alerts, and charting.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Explore public congressional trade data with a 30-day history window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-semibold text-foreground">$0</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {freeFeatures.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {user ? (
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link href="/signup">Get Started</Link>
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="border-foreground/15 ring-2 ring-foreground/10">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Premium</CardTitle>
              <Badge>Popular</Badge>
            </div>
            <CardDescription>Unlock everything needed for serious monitoring and export workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-semibold text-foreground">$9.99<span className="text-base font-medium text-muted-foreground">/mo</span></div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {premiumFeatures.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {isPremium ? (
              <Button asChild className="w-full">
                <Link href="/settings/billing">Manage Billing</Link>
              </Button>
            ) : user ? (
              <CheckoutButton label="Upgrade Now" />
            ) : (
              <Button asChild className="w-full">
                <Link href="/login">Log in to Upgrade</Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
