import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MobileNav } from '@/components/nav/mobile-nav'
import { UserMenu } from '@/components/nav/user-menu'

type TopNavProps = {
  email: string | null
  planLabel: string
}

const links = [
  { href: '/dashboard', label: 'Trades' },
  { href: '/politicians', label: 'Politicians' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/pricing', label: 'Pricing' },
]

export function TopNav({ email, planLabel }: TopNavProps) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <MobileNav planLabel={planLabel} />
          <Link href="/dashboard" className="text-base font-semibold tracking-tight text-foreground">
            CapitolTrades
          </Link>
          <Badge variant="secondary" className="hidden md:inline-flex">
            {planLabel}
          </Badge>
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <UserMenu email={email} planLabel={planLabel} />
        </div>
      </div>
    </header>
  )
}
