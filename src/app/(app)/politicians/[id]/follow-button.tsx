'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type FollowButtonProps = {
  politicianId: string
  isPremium: boolean
}

export function FollowButton({ politicianId, isPremium }: FollowButtonProps) {
  const [loading, setLoading] = useState(false)
  const [followed, setFollowed] = useState(false)

  async function handleFollow() {
    if (!isPremium) {
      toast.error('Premium required to follow politicians')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ politician_id: politicianId }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to follow politician')
      }

      setFollowed(true)
      toast.success('You will now receive trade alerts for this politician')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to follow politician')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleFollow} disabled={loading || followed}>
      {loading ? 'Following…' : followed ? 'Following' : 'Follow'}
    </Button>
  )
}
