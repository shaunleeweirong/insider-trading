import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/nav/top-nav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let planLabel = 'Free'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_premium) {
      planLabel = 'Premium'
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <TopNav email={user?.email ?? null} planLabel={planLabel} />
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl flex-col px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-border bg-background/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 text-sm text-muted-foreground sm:px-6">
          <span>Not financial advice. Data may be delayed. See disclaimer.</span>
          <Link href="/legal/disclaimer" className="underline underline-offset-4 hover:text-foreground">
            disclaimer
          </Link>
        </div>
      </footer>
    </div>
  )
}
