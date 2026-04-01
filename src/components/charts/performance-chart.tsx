'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type PerformancePoint = {
  date: string
  close: number
  tradeType?: 'Purchase' | 'Sale' | 'Sale (Partial)' | 'Sale (Full)' | 'Exchange'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function CustomDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: PerformancePoint }) {
  if (!payload?.tradeType || cx == null || cy == null) {
    return null
  }

  const isBuy = payload.tradeType === 'Purchase'

  return <circle cx={cx} cy={cy} r={4} fill={isBuy ? 'var(--trade-buy)' : 'var(--trade-sell)'} />
}

export function PerformanceChart({
  title,
  data,
}: {
  title: string
  data: PerformancePoint[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            No chart data available yet.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(value) => {
                    const amount = typeof value === 'number' ? value : Number(value ?? 0)
                    return [`$${amount.toFixed(2)}`, 'Close']
                  }}
                  labelFormatter={(value) => formatDate(String(value))}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  dot={<CustomDot />}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
