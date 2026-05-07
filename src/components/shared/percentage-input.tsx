'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PercentageInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
  value: number | null | undefined
  onChange: (pct: number | null) => void
  fractionDigits?: number
}

export function PercentageInput({
  value,
  onChange,
  fractionDigits = 2,
  className,
  ...props
}: PercentageInputProps) {
  const [display, setDisplay] = React.useState(() =>
    value != null ? value.toFixed(fractionDigits) : ''
  )

  React.useEffect(() => {
    if (value == null) {
      setDisplay('')
    } else {
      setDisplay((prev) => (Number(prev) === value ? prev : value.toFixed(fractionDigits)))
    }
  }, [value, fractionDigits])

  return (
    <div className="relative">
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        className={cn('pr-8', className)}
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '')
          setDisplay(raw)
          if (raw === '' || raw === '.') {
            onChange(null)
            return
          }
          const pct = Number.parseFloat(raw)
          onChange(Number.isNaN(pct) ? null : pct)
        }}
        onBlur={() => {
          if (value != null) setDisplay(value.toFixed(fractionDigits))
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        %
      </span>
    </div>
  )
}
