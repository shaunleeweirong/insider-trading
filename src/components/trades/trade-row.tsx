import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import type { Chamber, Party, TradeTransactionType } from '@/types/database'

export type TradeTableItem = {
  id: string
  transaction_date: string
  disclosure_date: string | null
  ticker: string | null
  asset_name: string
  transaction_type: TradeTransactionType
  amount_range_raw: string
  politician: {
    id: string
    full_name: string
    party: Party | null
    chamber: Chamber
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getPartyClass(party: Party | null) {
  if (party === 'Democrat') return 'bg-party-dem/15 text-party-dem'
  if (party === 'Republican') return 'bg-party-rep/15 text-party-rep'
  if (party === 'Independent') return 'bg-party-ind/15 text-party-ind'

  return 'bg-muted text-muted-foreground'
}

function getTradeTypeClass(type: TradeTransactionType) {
  if (type === 'Purchase') return 'bg-trade-buy/15 text-trade-buy'

  return 'bg-trade-sell/15 text-trade-sell'
}

export function TradeRow({ trade }: { trade: TradeTableItem }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{formatDate(trade.transaction_date)}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Link
            href={`/politicians/${trade.politician.id}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {trade.politician.full_name}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className={getPartyClass(trade.politician.party)}>
              {trade.politician.party ?? 'Unknown'}
            </Badge>
            <span>{trade.politician.chamber}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {trade.ticker ? (
          <Link
            href={`/stocks/${encodeURIComponent(trade.ticker)}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {trade.ticker}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={getTradeTypeClass(trade.transaction_type)}>
          {trade.transaction_type}
        </Badge>
      </TableCell>
      <TableCell>{trade.amount_range_raw}</TableCell>
      <TableCell className="max-w-[16rem] truncate text-muted-foreground">{trade.asset_name}</TableCell>
    </TableRow>
  )
}
