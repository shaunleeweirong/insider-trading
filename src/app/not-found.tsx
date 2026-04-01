import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">404</p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you requested does not exist or may have moved.
      </p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  )
}
