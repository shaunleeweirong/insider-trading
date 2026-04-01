'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-3xl font-semibold tracking-tight text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        We hit an unexpected issue while loading this page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
