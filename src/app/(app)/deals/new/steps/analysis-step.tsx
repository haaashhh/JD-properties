'use client'

import { Controller, type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/shared/currency-input'
import { PercentageInput } from '@/components/shared/percentage-input'
import type { DealFormFullValues } from '../deal-form'

interface Props {
  form: UseFormReturn<DealFormFullValues>
}

export function AnalysisStep({ form }: Props) {
  const financingType = form.watch('financing_type')
  const loanBasis = form.watch('loan_basis')
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>
  const isCash = financingType === 'cash'

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Scenario name" error={errors.name?.message}>
        <Input
          placeholder="e.g. Conservative flip"
          {...form.register('name')}
        />
      </Field>

      <Field label="Analysis type">
        <Controller
          name="analysis_type"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flip">Flip</SelectItem>
                <SelectItem value="brrrr">BRRRR</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="ARV (after repair value)" error={errors.arv_cents?.message}>
        <Controller
          name="arv_cents"
          control={form.control}
          render={({ field }) => (
            <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
          )}
        />
      </Field>

      <Field label="Purchase price" error={errors.purchase_price_cents?.message}>
        <Controller
          name="purchase_price_cents"
          control={form.control}
          render={({ field }) => (
            <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
          )}
        />
      </Field>

      <Field label="Rehab estimate" error={errors.rehab_estimate_cents?.message}>
        <Controller
          name="rehab_estimate_cents"
          control={form.control}
          render={({ field }) => (
            <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
          )}
        />
      </Field>

      <Field label="ARV % rule">
        <Controller
          name="arv_percentage"
          control={form.control}
          render={({ field }) => (
            <PercentageInput value={field.value} onChange={(v) => field.onChange(v ?? 70)} />
          )}
        />
      </Field>

      <div className="sm:col-span-2 mt-2 rounded-md border p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Financing type">
            <Controller
              name="financing_type"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    if (v === 'cash') {
                      form.setValue('loan_amount_cents', null)
                      form.setValue('loan_to_value_pct', null)
                      form.setValue('interest_rate', null)
                      form.setValue('loan_term_months', null)
                      form.setValue('origination_points', null)
                      form.setValue('other_loan_fees_cents', 0)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="hard_money">Hard money</SelectItem>
                    <SelectItem value="conventional">Conventional</SelectItem>
                    <SelectItem value="private_money">Private money</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          {!isCash ? (
            <Field
              label="Loan basis"
              error={errors.loan_basis?.message}
            >
              <Controller
                name="loan_basis"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      if (v === 'amount') form.setValue('loan_to_value_pct', null)
                      if (v === 'ltv') form.setValue('loan_amount_cents', null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Loan amount ($)</SelectItem>
                      <SelectItem value="ltv">Loan-to-value (%)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          ) : null}
        </div>

        {!isCash ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {loanBasis === 'amount' ? (
              <Field label="Loan amount" error={errors.loan_amount_cents?.message}>
                <Controller
                  name="loan_amount_cents"
                  control={form.control}
                  render={({ field }) => (
                    <CurrencyInput value={field.value ?? 0} onChange={field.onChange} />
                  )}
                />
              </Field>
            ) : (
              <Field label="Loan-to-value %" error={errors.loan_to_value_pct?.message}>
                <Controller
                  name="loan_to_value_pct"
                  control={form.control}
                  render={({ field }) => (
                    <PercentageInput value={field.value ?? 0} onChange={field.onChange} />
                  )}
                />
              </Field>
            )}
            <Field label="Interest rate (annual)">
              <Controller
                name="interest_rate"
                control={form.control}
                render={({ field }) => (
                  <PercentageInput value={field.value ?? 0} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field label="Loan term (months)">
              <Input
                type="number"
                min="1"
                max="360"
                step="1"
                {...form.register('loan_term_months')}
              />
            </Field>
            <Field label="Origination points">
              <Controller
                name="origination_points"
                control={form.control}
                render={({ field }) => (
                  <PercentageInput value={field.value ?? 0} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field label="Other loan fees">
              <Controller
                name="other_loan_fees_cents"
                control={form.control}
                render={({ field }) => (
                  <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                )}
              />
            </Field>
          </div>
        ) : null}
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
