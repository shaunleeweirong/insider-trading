import Link from 'next/link'
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
import { ManageSubscriptionButton } from '@/app/(app)/settings/billing/manage-subscription-button'

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Log in to view billing settings.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, stripe_price_id, current_period_end')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .maybeSingle()

  const isPremium = profile?.is_premium ?? false

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Billing</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Plan and billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your current plan and open Stripe Customer Portal for payment updates or cancellation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isPremium ? 'Premium Plan' : 'Free Plan'}</CardTitle>
          <CardDescription>
            {isPremium
              ? 'You have access to full history, exports, alerts, and charting.'
              : 'Upgrade to Premium to unlock exports, alerts, and full trade history.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-4">
            <span>Status</span>
            <span className="font-medium text-foreground">{subscription?.status ?? (isPremium ? 'active' : 'free')}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Price</span>
            <span className="font-medium text-foreground">{isPremium ? '$9.99 / mo' : '$0'}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Next billing date</span>
            <span className="font-medium text-foreground">{formatDate(subscription?.current_period_end ?? null)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Stripe customer</span>
            <span className="font-medium text-foreground">{profile?.stripe_customer_id ? 'Connected' : 'Not connected'}</span>
          </div>
        </CardContent>
        <CardFooter>
          {isPremium && profile?.stripe_customer_id ? (
            <div className="grid w-full gap-3 sm:grid-cols-2">
              <ManageSubscriptionButton />
              <ManageSubscriptionButton
                label="Cancel Subscription"
                confirmLabel="Open portal to cancel"
                description="Cancellation is handled in Stripe Customer Portal. You can review the subscription and cancel there."
              />
            </div>
          ) : (
            <Button asChild className="w-full">
              <Link href="/pricing">Upgrade to Premium</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
