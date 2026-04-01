import Link from 'next/link'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Chamber, Party } from '@/types/database'

type PoliticianHeaderProps = {
  politician: {
    id: string
    full_name: string
    party: Party | null
    chamber: Chamber
    state: string | null
    image_url: string | null
  }
  tradeCount: number
  mostTradedTicker: string | null
  isPremium: boolean
}

function getPartyClass(party: Party | null) {
  if (party === 'Democrat') return 'bg-party-dem/15 text-party-dem'
  if (party === 'Republican') return 'bg-party-rep/15 text-party-rep'
  if (party === 'Independent') return 'bg-party-ind/15 text-party-ind'

  return 'bg-muted text-muted-foreground'
}

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean)
  const first = parts[0]?.[0] ?? 'P'
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

export function PoliticianHeader({
  politician,
  tradeCount,
  mostTradedTicker,
  isPremium,
}: PoliticianHeaderProps) {
  return (
    <Card>
      <CardHeader className="gap-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar size="lg" className="size-20">
              {politician.image_url ? <AvatarImage src={politician.image_url} alt={politician.full_name} /> : null}
              <AvatarFallback>{getInitials(politician.full_name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-3">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{politician.full_name}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className={getPartyClass(politician.party)}>
                    {politician.party ?? 'Unknown'}
                  </Badge>
                  <span>{politician.chamber}</span>
                  {politician.state ? <span>{politician.state}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{tradeCount} trades tracked</span>
                <span>Most traded: {mostTradedTicker ?? '—'}</span>
              </div>
            </div>
          </div>
          {isPremium ? (
            <Button>Follow</Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/pricing">Upgrade to follow</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Trade history and the most-traded ticker trend are shown below.
      </CardContent>
    </Card>
  )
}
