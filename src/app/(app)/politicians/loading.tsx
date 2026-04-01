import { Skeleton } from '@/components/ui/skeleton'

export default function PoliticiansLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
