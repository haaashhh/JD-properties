import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-12 text-center">
      {Icon ? <Icon className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" /> : null}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action ? (
        <Button
          nativeButton={false}
          className="mt-4"
          render={<Link href={action.href}>{action.label}</Link>}
        />
      ) : null}
    </div>
  )
}
