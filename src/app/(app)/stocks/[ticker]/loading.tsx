import { Skeleton } from '@/components/ui/skeleton'

export default function StockDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-56" />
      </div>
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
