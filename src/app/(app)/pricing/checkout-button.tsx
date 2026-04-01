'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type CheckoutButtonProps = {
  disabled?: boolean
  label: string
}

export function CheckoutButton({ disabled = false, label }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    try {
      setLoading(true)
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to start checkout')
      }

      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start checkout')
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCheckout} disabled={disabled || loading} className="w-full">
      {loading ? 'Redirecting…' : label}
    </Button>
  )
}
