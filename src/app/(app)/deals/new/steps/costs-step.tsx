'use client'

import { Controller, type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/shared/currency-input'
import { PercentageInput } from '@/components/shared/percentage-input'
import type { DealFormFullValues } from '../deal-form'

export function CostsStep({ form }: { form: UseFormReturn<DealFormFullValues> }) {
  return (
    <div className="space-y-6">
      <Section title="Closing & sale costs">
        <Field label="Buying closing costs">
          <Controller
            name="buying_closing_costs_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="Selling closing costs">
          <Controller
            name="selling_closing_costs_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="Buy agent commission">
          <Controller
            name="buy_agent_commission_pct"
            control={form.control}
            render={({ field }) => (
              <PercentageInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="Sell agent commission">
          <Controller
            name="sell_agent_commission_pct"
            control={form.control}
            render={({ field }) => (
              <PercentageInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="Staging costs">
          <Controller
            name="staging_costs_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
      </Section>

      <Section title="Holding (monthly) — over a 6 month default unless overridden">
        <Field label="Holding period (months)">
          <Input type="number" min="0" max="60" step="0.5" {...form.register('holding_period_months')} />
        </Field>
        <Field label="Property taxes / mo">
          <Controller
            name="holding_taxes_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="Insurance / mo">
          <Controller
            name="holding_insurance_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="Utilities / mo">
          <Controller
            name="holding_utilities_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="HOA / mo">
          <Controller
            name="holding_hoa_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="Other / mo (security, landscaping, etc.)">
          <Controller
            name="holding_other_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
      </Section>

      <Section title="Cash invested (override)">
        <Field
          label="Custom cash invested (optional)"
          hint="Leave blank to use the computed default: total project cost − loan amount."
        >
          <Controller
            name="cash_invested_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value ?? 0} onChange={field.onChange} />
            )}
          />
        </Field>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
