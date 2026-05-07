import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const usdFormatterPrecise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

// Currency is stored as cents (BIGINT) everywhere. The UI is the only layer
// that converts to dollars. Pass `precise: true` when cents matter (totals).
export function formatCurrency(cents: number | null | undefined, opts?: { precise?: boolean }) {
  if (cents == null) return '—'
  const dollars = cents / 100
  return opts?.precise ? usdFormatterPrecise.format(dollars) : usdFormatter.format(dollars)
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function formatDate(input: string | Date | null | undefined) {
  if (!input) return '—'
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
}

export function formatPercentage(pct: number | null | undefined, fractionDigits = 1) {
  if (pct == null || Number.isNaN(pct)) return '—'
  return `${pct.toFixed(fractionDigits)}%`
}
