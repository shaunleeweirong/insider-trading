'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type ManageSubscriptionButtonProps = {
  label?: string
  confirmLabel?: string
  description?: string
}

export function ManageSubscriptionButton({
  label = 'Manage Subscription',
  confirmLabel = 'Continue to Stripe',
  description = 'You will be redirected to Stripe Customer Portal to manage billing, payment methods, or cancellation.',
}: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handlePortal() {
    try {
      setLoading(true)
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to open billing portal')
      }

      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open billing portal')
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open Stripe Customer Portal</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handlePortal} disabled={loading}>
            {loading ? 'Redirecting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
