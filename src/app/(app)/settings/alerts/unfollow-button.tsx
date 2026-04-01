'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function UnfollowButton({ politicianId }: { politicianId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleUnfollow() {
    try {
      setLoading(true)
      const response = await fetch('/api/follow', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ politician_id: politicianId }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to unfollow politician')
      }

      toast.success('Unfollowed politician')
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to unfollow politician')
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleUnfollow} disabled={loading}>
      {loading ? 'Removing…' : 'Unfollow'}
    </Button>
  )
}
