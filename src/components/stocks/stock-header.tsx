import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type StockHeaderProps = {
  ticker: string
  companyName: string | null
  price: number | null
  change: number | null
}

function formatCurrency(value: number | null) {
  if (value == null) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export function StockHeader({ ticker, companyName, price, change }: StockHeaderProps) {
  const isPositive = (change ?? 0) >= 0

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary">Ticker</Badge>
            <CardTitle className="text-2xl">{ticker.toUpperCase()}</CardTitle>
            <p className="text-sm text-muted-foreground">{companyName ?? 'No data available'}</p>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-2xl font-semibold text-foreground">{formatCurrency(price)}</div>
            <div className={isPositive ? 'text-sm text-trade-buy' : 'text-sm text-trade-sell'}>
              {change == null ? 'No price change data' : `${isPositive ? '+' : ''}${change.toFixed(2)} today`}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        See which politicians traded this ticker and when they disclosed those moves.
      </CardContent>
    </Card>
  )
}
