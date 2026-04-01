import Link from 'next/link'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Chamber, Party } from '@/types/database'

export type PoliticianCardItem = {
  id: string
  full_name: string
  party: Party | null
  chamber: Chamber
  state: string | null
  image_url: string | null
  trade_count: number
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

export function PoliticianCard({ politician }: { politician: PoliticianCardItem }) {
  return (
    <Card className="h-full justify-between">
      <CardHeader className="gap-4">
        <div className="flex items-start gap-4">
          <Avatar size="lg" className="size-14">
            {politician.image_url ? <AvatarImage src={politician.image_url} alt={politician.full_name} /> : null}
            <AvatarFallback>{getInitials(politician.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-lg">
              <Link href={`/politicians/${politician.id}`} className="underline-offset-4 hover:underline">
                {politician.full_name}
              </Link>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className={getPartyClass(politician.party)}>
                {politician.party ?? 'Unknown'}
              </Badge>
              <span>{politician.chamber}</span>
              {politician.state ? <span>{politician.state}</span> : null}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>
          Ranked by recent trade activity so you can quickly identify the most active members.
        </CardDescription>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Trade count</div>
          <div className="text-lg font-semibold text-foreground">{politician.trade_count}</div>
        </div>
        <Link href={`/politicians/${politician.id}`} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
          View profile
        </Link>
      </CardFooter>
    </Card>
  )
}
