import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function LoadingSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4 w-full', i === lines - 1 && 'w-2/3')} />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="mb-3 h-4 w-32" />
      <Skeleton className="mb-2 h-8 w-24" />
      <Skeleton className="h-3 w-40" />
    </div>
  )
}
