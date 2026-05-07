'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type CurrencyInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
  value: number | null | undefined
  onChange: (cents: number | null) => void
}

// Currency is cents internally. The component owns the displayed string;
// onChange emits cents.
export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const [display, setDisplay] = React.useState(() => (value != null ? (value / 100).toFixed(2) : ''))

  React.useEffect(() => {
    if (value == null) {
      setDisplay('')
    } else {
      const formatted = (value / 100).toFixed(2)
      setDisplay((prev) => (Number(prev) * 100 === value ? prev : formatted))
    }
  }, [value])

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        className={cn('pl-7', className)}
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '')
          setDisplay(raw)
          if (raw === '' || raw === '.') {
            onChange(null)
            return
          }
          const dollars = Number.parseFloat(raw)
          if (Number.isNaN(dollars)) {
            onChange(null)
          } else {
            onChange(Math.round(dollars * 100))
          }
        }}
        onBlur={() => {
          if (value != null) setDisplay((value / 100).toFixed(2))
        }}
      />
    </div>
  )
}
