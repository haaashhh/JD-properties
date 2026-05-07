'use client'

import { useMemo, useState, useTransition } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createDealSchema, type CreateDealInput } from '@/types/schemas/deal'
import {
  calculateBRRRRResults,
  calculateFlipResults,
} from '@/lib/calculations/deal-analyzer'
import type { BRRRRInputs, FlipInputs } from '@/types/deal'
import { createPropertyWithAnalysis } from '../actions'
import { DealResultsPanel, type ResultsViewModel } from '../deal-results-panel'
import { StepIndicator } from './step-indicator'
import { PropertyStep } from './steps/property-step'
import { AnalysisStep } from './steps/analysis-step'
import { CostsStep } from './steps/costs-step'
import { BRRRRStep } from './steps/brrrr-step'

export type DealFormFullValues = CreateDealInput

interface PropertyOption {
  id: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip: string
}

interface Defaults {
  default_arv_pct: number
  default_holding_months: number
  default_sell_commission_pct: number
}

const STEP_FIELDS_PROPERTY_EXISTING: (keyof DealFormFullValues)[] = [
  'property_mode',
  'property_id',
]
const STEP_FIELDS_PROPERTY_NEW: (keyof DealFormFullValues)[] = [
  'property_mode',
  'address_line1',
  'city',
  'state',
  'zip',
  'property_type',
]
const STEP_FIELDS_ANALYSIS: (keyof DealFormFullValues)[] = [
  'name',
  'analysis_type',
  'arv_cents',
  'purchase_price_cents',
  'rehab_estimate_cents',
  'arv_percentage',
  'financing_type',
  'loan_basis',
  'loan_amount_cents',
  'loan_to_value_pct',
  'interest_rate',
  'loan_term_months',
  'origination_points',
]
const STEP_FIELDS_COSTS: (keyof DealFormFullValues)[] = [
  'buying_closing_costs_cents',
  'selling_closing_costs_cents',
  'holding_period_months',
  'holding_taxes_cents',
  'holding_insurance_cents',
  'holding_utilities_cents',
  'holding_hoa_cents',
  'holding_other_cents',
  'buy_agent_commission_pct',
  'sell_agent_commission_pct',
  'staging_costs_cents',
]
const STEP_FIELDS_BRRRR: (keyof DealFormFullValues)[] = [
  'monthly_rent_cents',
  'vacancy_rate_pct',
  'property_mgmt_fee_pct',
  'monthly_maintenance_cents',
  'refinance_ltv_pct',
  'refinance_interest_rate',
  'refinance_term_years',
]

export function DealForm({
  properties,
  defaults,
}: {
  properties: PropertyOption[]
  defaults: Defaults
}) {
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState<number[]>([])
  const [pending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<DealFormFullValues>({
    // z.coerce.number() makes Zod's input type `unknown` while the output is
    // `number`; RHF infers from the input shape, so the resolver type doesn't
    // line up with `DealFormFullValues`. Runtime validation still works.
    resolver: zodResolver(createDealSchema) as unknown as Resolver<DealFormFullValues>,
    mode: 'onTouched',
    defaultValues: {
      property_mode: properties.length > 0 ? 'existing' : 'new',
      property_id: null,
      property_type: 'sfr',
      address_line1: '',
      city: '',
      state: '',
      zip: '',
      address_line2: '',
      sqft: null,
      bedrooms: null,
      bathrooms: null,
      year_built: null,
      name: 'Initial scenario',
      analysis_type: 'flip',
      arv_cents: 0,
      purchase_price_cents: 0,
      rehab_estimate_cents: 0,
      arv_percentage: defaults.default_arv_pct,
      financing_type: 'hard_money',
      loan_basis: 'amount',
      loan_amount_cents: 0,
      loan_to_value_pct: null,
      interest_rate: 12,
      loan_term_months: 6,
      origination_points: 2,
      other_loan_fees_cents: 0,
      buying_closing_costs_cents: 0,
      selling_closing_costs_cents: 0,
      holding_period_months: defaults.default_holding_months,
      holding_taxes_cents: 0,
      holding_insurance_cents: 0,
      holding_utilities_cents: 0,
      holding_interest_cents: 0,
      holding_hoa_cents: 0,
      holding_other_cents: 0,
      buy_agent_commission_pct: 0,
      sell_agent_commission_pct: defaults.default_sell_commission_pct,
      staging_costs_cents: 0,
      cash_invested_cents: null,
      monthly_rent_cents: null,
      vacancy_rate_pct: 7,
      property_mgmt_fee_pct: 8,
      monthly_maintenance_cents: 0,
      refinance_ltv_pct: 75,
      refinance_interest_rate: 7,
      refinance_term_years: 30,
    },
  })

  const values = form.watch()
  const isBrrrr = values.analysis_type === 'brrrr'

  const steps = useMemo(() => {
    const base = [
      { label: 'Property' },
      { label: 'Analysis' },
      { label: 'Costs' },
    ]
    return isBrrrr ? [...base, { label: 'BRRRR' }] : base
  }, [isBrrrr])

  const stepFields = (idx: number): (keyof DealFormFullValues)[] => {
    if (idx === 0) {
      return values.property_mode === 'existing'
        ? STEP_FIELDS_PROPERTY_EXISTING
        : STEP_FIELDS_PROPERTY_NEW
    }
    if (idx === 1) return STEP_FIELDS_ANALYSIS
    if (idx === 2) return STEP_FIELDS_COSTS
    return STEP_FIELDS_BRRRR
  }

  const goNext = async () => {
    const ok = await form.trigger(stepFields(step) as never)
    if (!ok) return
    setCompleted((c) => Array.from(new Set([...c, step])))
    setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const onSubmit = form.handleSubmit((rawValues) => {
    setSubmitError(null)
    startTransition(async () => {
      const result = await createPropertyWithAnalysis(rawValues as CreateDealInput)
      if (result && 'error' in result) {
        setSubmitError(result.error)
        toast.error(result.error)
      }
      // Success path redirects from the server action; no client navigation needed.
    })
  })

  const previewVm = useMemo<ResultsViewModel>(() => {
    const flipInput: FlipInputs = {
      arv_cents: values.arv_cents ?? 0,
      purchase_price_cents: values.purchase_price_cents ?? 0,
      rehab_estimate_cents: values.rehab_estimate_cents ?? 0,
      arv_percentage: values.arv_percentage ?? 70,
      financing_type: values.financing_type ?? 'cash',
      loan_basis: values.loan_basis ?? 'amount',
      loan_amount_cents: values.loan_amount_cents ?? null,
      loan_to_value_pct: values.loan_to_value_pct ?? null,
      interest_rate: values.interest_rate ?? null,
      loan_term_months: values.loan_term_months ?? null,
      origination_points: values.origination_points ?? null,
      other_loan_fees_cents: values.other_loan_fees_cents ?? 0,
      buying_closing_costs_cents: values.buying_closing_costs_cents ?? 0,
      selling_closing_costs_cents: values.selling_closing_costs_cents ?? 0,
      holding_period_months: values.holding_period_months ?? 0,
      holding_taxes_cents: values.holding_taxes_cents ?? 0,
      holding_insurance_cents: values.holding_insurance_cents ?? 0,
      holding_utilities_cents: values.holding_utilities_cents ?? 0,
      holding_interest_cents: values.holding_interest_cents ?? 0,
      holding_hoa_cents: values.holding_hoa_cents ?? 0,
      holding_other_cents: values.holding_other_cents ?? 0,
      buy_agent_commission_pct: values.buy_agent_commission_pct ?? 0,
      sell_agent_commission_pct: values.sell_agent_commission_pct ?? 0,
      staging_costs_cents: values.staging_costs_cents ?? 0,
      cash_invested_cents: values.cash_invested_cents ?? null,
    }

    const results = isBrrrr
      ? calculateBRRRRResults({
          ...flipInput,
          monthly_rent_cents: values.monthly_rent_cents ?? null,
          vacancy_rate_pct: values.vacancy_rate_pct ?? null,
          property_mgmt_fee_pct: values.property_mgmt_fee_pct ?? null,
          monthly_maintenance_cents: values.monthly_maintenance_cents ?? null,
          refinance_ltv_pct: values.refinance_ltv_pct ?? null,
          refinance_interest_rate: values.refinance_interest_rate ?? null,
          refinance_term_years: values.refinance_term_years ?? null,
        } satisfies BRRRRInputs)
      : calculateFlipResults(flipInput)

    return {
      analysis_type: values.analysis_type ?? 'flip',
      arv_cents: flipInput.arv_cents,
      rehab_estimate_cents: flipInput.rehab_estimate_cents,
      purchase_price_cents: flipInput.purchase_price_cents,
      buying_closing_costs_cents: flipInput.buying_closing_costs_cents,
      selling_closing_costs_cents: flipInput.selling_closing_costs_cents,
      staging_costs_cents: flipInput.staging_costs_cents,
      other_loan_fees_cents: flipInput.other_loan_fees_cents,
      holding_taxes_cents: flipInput.holding_taxes_cents,
      holding_insurance_cents: flipInput.holding_insurance_cents,
      holding_utilities_cents: flipInput.holding_utilities_cents,
      holding_interest_cents: flipInput.holding_interest_cents,
      holding_hoa_cents: flipInput.holding_hoa_cents,
      holding_other_cents: flipInput.holding_other_cents,
      holding_period_months: flipInput.holding_period_months,
      results,
    }
  }, [values, isBrrrr])

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <StepIndicator
          steps={steps}
          current={step}
          completed={completed}
          onJump={(i) => i <= step || completed.includes(i) ? setStep(i) : null}
        />
        <Card>
          <CardContent className="pt-6">
            {step === 0 && <PropertyStep form={form} properties={properties} />}
            {step === 1 && <AnalysisStep form={form} />}
            {step === 2 && <CostsStep form={form} />}
            {step === 3 && isBrrrr && <BRRRRStep form={form} />}
          </CardContent>
        </Card>

        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0 || pending}>
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={goNext} disabled={pending}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save deal'}
            </Button>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <DealResultsPanel vm={previewVm} />
      </aside>
    </form>
  )
}
