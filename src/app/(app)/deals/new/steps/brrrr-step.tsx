'use client'

import { Controller, type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/shared/currency-input'
import { PercentageInput } from '@/components/shared/percentage-input'
import type { DealFormFullValues } from '../deal-form'

export function BRRRRStep({ form }: { form: UseFormReturn<DealFormFullValues> }) {
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        BRRRR-only inputs. The analyzer uses these to compute monthly cash flow and refinance
        cash-out.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monthly rent" error={errors.monthly_rent_cents?.message}>
          <Controller
            name="monthly_rent_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value ?? 0} onChange={field.onChange} />
            )}
          />
        </Field>
        <Field label="Vacancy rate">
          <Controller
            name="vacancy_rate_pct"
            control={form.control}
            render={({ field }) => (
              <PercentageInput value={field.value ?? 7} onChange={field.onChange} />
            )}
          />
        </Field>
        <Field label="Property mgmt fee">
          <Controller
            name="property_mgmt_fee_pct"
            control={form.control}
            render={({ field }) => (
              <PercentageInput value={field.value ?? 8} onChange={field.onChange} />
            )}
          />
        </Field>
        <Field label="Monthly maintenance reserve">
          <Controller
            name="monthly_maintenance_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value ?? 0} onChange={field.onChange} />
            )}
          />
        </Field>
      </div>

      <div className="rounded-md border p-4 space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Refinance terms
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Refi LTV" error={errors.refinance_ltv_pct?.message}>
            <Controller
              name="refinance_ltv_pct"
              control={form.control}
              render={({ field }) => (
                <PercentageInput value={field.value ?? 75} onChange={field.onChange} />
              )}
            />
          </Field>
          <Field label="Refi interest rate">
            <Controller
              name="refinance_interest_rate"
              control={form.control}
              render={({ field }) => (
                <PercentageInput value={field.value ?? 7} onChange={field.onChange} />
              )}
            />
          </Field>
          <Field label="Refi term (years)">
            <Input type="number" min="5" max="40" step="1" {...form.register('refinance_term_years')} />
          </Field>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
