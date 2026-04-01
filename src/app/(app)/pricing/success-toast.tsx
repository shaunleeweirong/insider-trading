'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function PricingSuccessToast({ show }: { show: boolean }) {
  useEffect(() => {
    if (show) {
      toast.success('Welcome to Premium!')
    }
  }, [show])

  return null
}
