import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TradeRow, type TradeTableItem } from '@/components/trades/trade-row'

export type { TradeTableItem } from '@/components/trades/trade-row'

type TradeTableProps = {
  trades: TradeTableItem[]
  currentPage?: number
  hasNextPage?: boolean
  nextPageHref?: string
  emptyTitle?: string
  emptyDescription?: string
}

export function TradeTable({
  trades,
  currentPage = 1,
  hasNextPage = false,
  nextPageHref,
  emptyTitle = 'No trades found',
  emptyDescription = 'Trade activity will show up here after the first sync completes.',
}: TradeTableProps) {
  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center">
        <h3 className="text-base font-medium text-foreground">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Politician</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount Range</TableHead>
              <TableHead>Asset Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>Page {currentPage}</span>
        {hasNextPage && nextPageHref ? (
          <Button asChild variant="outline">
            <Link href={nextPageHref}>Next page</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
