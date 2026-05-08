'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PercentageInput } from '@/components/shared/percentage-input'
import { Input } from '@/components/ui/input'
import {
  organizationSettingsSchema,
  type OrganizationSettingsInput,
} from '@/types/schemas/organization-settings'
import { updateOrganizationSettings } from './actions'

interface Props {
  initialValues: OrganizationSettingsInput
  canEdit: boolean
}

export function SettingsForm({ initialValues, canEdit }: Props) {
  const [pending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const form = useForm<OrganizationSettingsInput>({
    resolver: zodResolver(organizationSettingsSchema) as unknown as Resolver<OrganizationSettingsInput>,
    defaultValues: initialValues,
    mode: 'onTouched',
  })

  const onSubmit = form.handleSubmit((values) => {
    setGlobalError(null)
    startTransition(async () => {
      const result = await updateOrganizationSettings(values)
      if ('error' in result) {
        setGlobalError(result.error)
        toast.error(result.error)
        return
      }
      toast.success('Settings saved.')
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace defaults</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormRow
              label="Default ARV %"
              description="Used by the deal analyzer to compute Maximum Purchase Price (MPP)."
              error={form.formState.errors.default_arv_pct?.message}
            >
              <Controller
                name="default_arv_pct"
                control={form.control}
                render={({ field }) => (
                  <PercentageInput
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? 0)}
                    disabled={!canEdit || pending}
                  />
                )}
              />
            </FormRow>

            <FormRow
              label="Default contingency %"
              description="Auto-applied to project budgets on creation."
              error={form.formState.errors.default_contingency_pct?.message}
            >
              <Controller
                name="default_contingency_pct"
                control={form.control}
                render={({ field }) => (
                  <PercentageInput
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? 0)}
                    disabled={!canEdit || pending}
                  />
                )}
              />
            </FormRow>

            <FormRow
              label="Default holding period (months)"
              description="Form starting value for new deal analyses."
              error={form.formState.errors.default_holding_months?.message}
            >
              <Input
                type="number"
                min="0"
                max="60"
                step="0.5"
                disabled={!canEdit || pending}
                {...form.register('default_holding_months')}
              />
            </FormRow>

            <FormRow
              label="Default sell commission %"
              description="Listing + buyer-side combined."
              error={form.formState.errors.default_sell_commission_pct?.message}
            >
              <Controller
                name="default_sell_commission_pct"
                control={form.control}
                render={({ field }) => (
                  <PercentageInput
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? 0)}
                    disabled={!canEdit || pending}
                  />
                )}
              />
            </FormRow>

            <FormRow
              label="Over-budget alert %"
              description="Triggers a warning when project spend reaches this percentage of budget."
              error={form.formState.errors.over_budget_alert_pct?.message}
            >
              <Controller
                name="over_budget_alert_pct"
                control={form.control}
                render={({ field }) => (
                  <PercentageInput
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? 0)}
                    disabled={!canEdit || pending}
                  />
                )}
              />
            </FormRow>
          </div>

          {globalError ? (
            <p className="text-sm text-destructive">{globalError}</p>
          ) : null}

          {canEdit ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners and admins can change workspace defaults.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

function FormRow({
  label,
  description,
  error,
  children,
}: {
  label: string
  description?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
