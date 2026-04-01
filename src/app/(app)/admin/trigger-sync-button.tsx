'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function TriggerSyncButton() {
  const [loading, setLoading] = useState(false)

  async function handleTrigger() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/trigger-sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to trigger sync')
      }

      toast.success('Sync triggered successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to trigger sync')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleTrigger} disabled={loading}>
      {loading ? 'Triggering…' : 'Trigger Sync Now'}
    </Button>
  )
}
