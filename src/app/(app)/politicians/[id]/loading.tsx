import { Skeleton } from '@/components/ui/skeleton'

export default function PoliticianDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="ml-auto h-10 w-28" />
      <Skeleton className="h-96 w-full rounded-2xl" />
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
