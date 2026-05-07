'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dealFormSchema, type DealFormValues } from '@/types/schemas/deal'
import {
  calculateBRRRRResults,
  calculateFlipResults,
} from '@/lib/calculations/deal-analyzer'
import type { BRRRRInputs, DealAnalysisRow, FlipInputs } from '@/types/deal'
import { updateDealAnalysis } from '../../actions'
import { DealResultsPanel, type ResultsViewModel } from '../../deal-results-panel'
import { AnalysisStep } from '../../new/steps/analysis-step'
import { CostsStep } from '../../new/steps/costs-step'
import { BRRRRStep } from '../../new/steps/brrrr-step'

interface Props {
  dealId: string
  initialDeal: DealAnalysisRow
}

export function EditDealForm({ dealId, initialDeal }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema) as unknown as Resolver<DealFormValues>,
    mode: 'onTouched',
    defaultValues: {
      // Property step defaults to "existing" but the edit page never asks for it.
      property_mode: 'existing',
      property_id: initialDeal.property_id,
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

      name: initialDeal.name,
      analysis_type: (initialDeal.analysis_type as 'flip' | 'brrrr') ?? 'flip',
      arv_cents: initialDeal.arv_cents,
      purchase_price_cents: initialDeal.purchase_price_cents,
      rehab_estimate_cents: initialDeal.rehab_estimate_cents,
      arv_percentage: Number(initialDeal.arv_percentage ?? 70),
      financing_type:
        (initialDeal.financing_type as 'cash' | 'hard_money' | 'conventional' | 'private_money') ??
        'cash',
      loan_basis: (initialDeal.loan_basis as 'amount' | 'ltv') ?? 'amount',
      loan_amount_cents: initialDeal.loan_amount_cents,
      loan_to_value_pct: initialDeal.loan_to_value_pct,
      interest_rate: initialDeal.interest_rate,
      loan_term_months: initialDeal.loan_term_months,
      origination_points: initialDeal.origination_points,
      other_loan_fees_cents: initialDeal.other_loan_fees_cents ?? 0,
      buying_closing_costs_cents: initialDeal.buying_closing_costs_cents ?? 0,
      selling_closing_costs_cents: initialDeal.selling_closing_costs_cents ?? 0,
      holding_period_months: Number(initialDeal.holding_period_months ?? 0),
      holding_taxes_cents: initialDeal.holding_taxes_cents ?? 0,
      holding_insurance_cents: initialDeal.holding_insurance_cents ?? 0,
      holding_utilities_cents: initialDeal.holding_utilities_cents ?? 0,
      holding_interest_cents: initialDeal.holding_interest_cents ?? 0,
      holding_hoa_cents: initialDeal.holding_hoa_cents ?? 0,
      holding_other_cents: initialDeal.holding_other_cents ?? 0,
      buy_agent_commission_pct: Number(initialDeal.buy_agent_commission_pct ?? 0),
      sell_agent_commission_pct: Number(initialDeal.sell_agent_commission_pct ?? 5.5),
      staging_costs_cents: initialDeal.staging_costs_cents ?? 0,
      cash_invested_cents: initialDeal.cash_invested_cents,
      monthly_rent_cents: initialDeal.monthly_rent_cents,
      vacancy_rate_pct: initialDeal.vacancy_rate_pct,
      property_mgmt_fee_pct: initialDeal.property_mgmt_fee_pct,
      monthly_maintenance_cents: initialDeal.monthly_maintenance_cents,
      refinance_ltv_pct: initialDeal.refinance_ltv_pct,
      refinance_interest_rate: initialDeal.refinance_interest_rate,
      refinance_term_years: initialDeal.refinance_term_years,
    },
  })

  const values = form.watch()
  const isBrrrr = values.analysis_type === 'brrrr'

  const onSubmit = form.handleSubmit((rawValues) => {
    setSubmitError(null)
    startTransition(async () => {
      const result = await updateDealAnalysis(dealId, rawValues)
      if ('error' in result) {
        setSubmitError(result.error)
        toast.error(result.error)
        return
      }
      toast.success('Saved.')
      router.push(`/deals/${dealId}`)
    })
  })

  const previewVm = useMemo<ResultsViewModel>(() => {
    const flipInput: FlipInputs = {
      arv_cents: values.arv_cents,
      purchase_price_cents: values.purchase_price_cents,
      rehab_estimate_cents: values.rehab_estimate_cents,
      arv_percentage: values.arv_percentage,
      financing_type: values.financing_type,
      loan_basis: values.loan_basis,
      loan_amount_cents: values.loan_amount_cents,
      loan_to_value_pct: values.loan_to_value_pct,
      interest_rate: values.interest_rate,
      loan_term_months: values.loan_term_months,
      origination_points: values.origination_points,
      other_loan_fees_cents: values.other_loan_fees_cents,
      buying_closing_costs_cents: values.buying_closing_costs_cents,
      selling_closing_costs_cents: values.selling_closing_costs_cents,
      holding_period_months: values.holding_period_months,
      holding_taxes_cents: values.holding_taxes_cents,
      holding_insurance_cents: values.holding_insurance_cents,
      holding_utilities_cents: values.holding_utilities_cents,
      holding_interest_cents: values.holding_interest_cents,
      holding_hoa_cents: values.holding_hoa_cents,
      holding_other_cents: values.holding_other_cents,
      buy_agent_commission_pct: values.buy_agent_commission_pct,
      sell_agent_commission_pct: values.sell_agent_commission_pct,
      staging_costs_cents: values.staging_costs_cents,
      cash_invested_cents: values.cash_invested_cents,
    }

    const results = isBrrrr
      ? calculateBRRRRResults({
          ...flipInput,
          monthly_rent_cents: values.monthly_rent_cents,
          vacancy_rate_pct: values.vacancy_rate_pct,
          property_mgmt_fee_pct: values.property_mgmt_fee_pct,
          monthly_maintenance_cents: values.monthly_maintenance_cents,
          refinance_ltv_pct: values.refinance_ltv_pct,
          refinance_interest_rate: values.refinance_interest_rate,
          refinance_term_years: values.refinance_term_years,
        } satisfies BRRRRInputs)
      : calculateFlipResults(flipInput)

    return {
      analysis_type: values.analysis_type,
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalysisStep form={form} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <CostsStep form={form} />
          </CardContent>
        </Card>

        {isBrrrr ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">BRRRR</CardTitle>
            </CardHeader>
            <CardContent>
              <BRRRRStep form={form} />
            </CardContent>
          </Card>
        ) : null}

        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(`/deals/${dealId}`)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <DealResultsPanel vm={previewVm} />
      </aside>
    </form>
  )
}
