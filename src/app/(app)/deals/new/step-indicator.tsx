'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  steps: { label: string; description?: string }[]
  current: number
  completed: number[]
  onJump: (index: number) => void
}

export function StepIndicator({ steps, current, completed, onJump }: Props) {
  return (
    <ol className="flex items-center gap-3 overflow-x-auto pb-1">
      {steps.map((step, idx) => {
        const isCurrent = idx === current
        const isComplete = completed.includes(idx)
        const isClickable = isComplete || isCurrent
        return (
          <li key={step.label} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => isClickable && onJump(idx)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors',
                isCurrent && 'border-primary bg-primary text-primary-foreground',
                isComplete && !isCurrent && 'border-primary/40 bg-muted text-foreground',
                !isCurrent && !isComplete && 'border-border text-muted-foreground',
                !isClickable && 'cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs',
                  isCurrent && 'bg-primary-foreground/20',
                  isComplete && !isCurrent && 'bg-primary text-primary-foreground'
                )}
              >
                {isComplete && !isCurrent ? <Check className="h-3 w-3" /> : idx + 1}
              </span>
              <span className="font-medium">{step.label}</span>
            </button>
            {idx < steps.length - 1 ? (
              <span className="h-px w-6 bg-border" aria-hidden="true" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
