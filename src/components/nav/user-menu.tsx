'use client'

import Link from 'next/link'
import { CreditCard, LogOut, Settings } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type UserMenuProps = {
  email: string | null
  planLabel: string
}

function getInitials(email: string | null) {
  if (!email) return 'U'

  const [localPart] = email.split('@')
  if (!localPart) return 'U'

  const segments = localPart.split(/[._-]/).filter(Boolean)
  const first = segments[0]
  const second = segments[1]

  if (!first) return 'U'
  if (!second) return first.slice(0, 2).toUpperCase()

  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase()
}

export function UserMenu({ email, planLabel }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-full border border-border bg-background px-2 py-1.5 transition-colors hover:bg-muted">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {planLabel}
          </Badge>
          <Avatar size="sm">
            <AvatarFallback>{getInitials(email)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="font-medium">Account</span>
            <span className="text-xs text-muted-foreground">{email ?? 'Signed in user'}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/alerts">
            <Settings className="size-4" />
            Alerts
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing">
            <CreditCard className="size-4" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
