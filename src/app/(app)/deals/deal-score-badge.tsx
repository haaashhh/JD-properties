import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { scoreDeal } from '@/lib/calculations/deal-analyzer'
import type { DealScore } from '@/types/deal'

const SCORE_STYLES: Record<DealScore, string> = {
  green: 'bg-green-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
}

const SCORE_LABEL: Record<DealScore, string> = {
  green: 'Strong deal — proceed',
  yellow: 'Marginal — review assumptions',
  red: 'Weak deal — renegotiate or walk',
}

interface Props {
  profitMarginPct: number | null
  roiPct: number | null
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function DealScoreBadge({
  profitMarginPct,
  roiPct,
  size = 'sm',
  showLabel = false,
  className,
}: Props) {
  const score = scoreDeal({ profit_margin_pct: profitMarginPct, roi_pct: roiPct })
  const dot = (
    <span
      className={cn(
        'inline-block rounded-full',
        SCORE_STYLES[score],
        size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'
      )}
      aria-label={SCORE_LABEL[score]}
    />
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn('inline-flex items-center gap-2', className)}>
            {dot}
            {showLabel ? (
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {score}
              </span>
            ) : null}
          </span>
        }
      />
      <TooltipContent side="top">{SCORE_LABEL[score]}</TooltipContent>
    </Tooltip>
  )
}
