'use client'

import { useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { stageAgingLevel } from '@/lib/constants'

const COLOR = {
  fresh: 'bg-emerald-500',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
}

// Reads Date.now() inside a useEffect so React's "no impure functions in
// render" rule is satisfied. The dot is briefly hidden on first paint, then
// renders the correct level after hydration.
export function StageAgingDot({
  stageChangedAt,
  className,
}: {
  stageChangedAt: string | null | undefined
  className?: string
}) {
  const [days, setDays] = useState<number | null>(null)

  useEffect(() => {
    if (!stageChangedAt) {
      setDays(null)
      return
    }
    setDays(
      Math.max(
        0,
        Math.floor((Date.now() - new Date(stageChangedAt).getTime()) / 86_400_000)
      )
    )
  }, [stageChangedAt])

  if (!stageChangedAt || days == null) return null
  const level = stageAgingLevel(days)
  const label = `${days} day${days === 1 ? '' : 's'} in this stage`
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn('inline-block h-2 w-2 rounded-full', COLOR[level], className)}
            aria-label={label}
          />
        }
      />
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
