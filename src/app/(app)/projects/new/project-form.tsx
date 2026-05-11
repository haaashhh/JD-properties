'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PercentageInput } from '@/components/shared/percentage-input'
import { PIPELINE_STAGES } from '@/lib/constants'
import { createProject } from '../actions'
import { projectFormSchema, type ProjectFormValues } from '@/types/schemas/project'

interface PropertyOpt {
  id: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip: string
}
interface DealOpt {
  id: string
  name: string
  property_id: string
}

function formatProp(p: PropertyOpt) {
  return `${p.address_line1}${p.address_line2 ? ' ' + p.address_line2 : ''}, ${p.city}, ${p.state} ${p.zip}`
}

export function ProjectForm({
  properties,
  deals,
  linkedDeal,
}: {
  properties: PropertyOpt[]
  deals: DealOpt[]
  linkedDeal: DealOpt | null
}) {
  const [pending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [propOpen, setPropOpen] = useState(false)
  const [dealOpen, setDealOpen] = useState(false)

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema) as unknown as Resolver<ProjectFormValues>,
    mode: 'onTouched',
    defaultValues: {
      name: linkedDeal?.name ?? '',
      property_mode: linkedDeal ? 'existing' : properties.length > 0 ? 'existing' : 'new',
      property_id: linkedDeal?.property_id ?? null,
      deal_analysis_id: linkedDeal?.id ?? null,
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: '',
      property_type: 'sfr',
      pipeline_stage: linkedDeal ? 'purchased' : 'lead',
      contingency_pct: 10,
      notes: '',
    },
  })

  const mode = form.watch('property_mode')
  const dealId = form.watch('deal_analysis_id')

  const onSubmit = form.handleSubmit((values) => {
    setSubmitError(null)
    startTransition(async () => {
      const result = await createProject(values)
      if (result && 'error' in result) {
        setSubmitError(result.error)
        toast.error(result.error)
      }
    })
  })

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <Field label="Project name" error={form.formState.errors.name?.message}>
            <Input placeholder="e.g. 1428 Maple Ridge" {...form.register('name')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Initial pipeline stage">
              <Controller
                name="pipeline_stage"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Contingency %">
              <Controller
                name="contingency_pct"
                control={form.control}
                render={({ field }) => (
                  <PercentageInput value={field.value} onChange={(v) => field.onChange(v ?? 10)} />
                )}
              />
            </Field>
          </div>

          <Field label="Link to a deal analysis (optional)">
            <Controller
              name="deal_analysis_id"
              control={form.control}
              render={({ field }) => {
                const selected = deals.find((d) => d.id === field.value)
                return (
                  <Popover open={dealOpen} onOpenChange={setDealOpen}>
                    <PopoverTrigger
                      render={
                        <Button type="button" variant="outline" className="w-full justify-between">
                          <span className="truncate">{selected?.name ?? 'None'}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      }
                    />
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by scenario name…" />
                        <CommandList>
                          <CommandEmpty>No deals available.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="__none__"
                              onSelect={() => {
                                field.onChange(null)
                                setDealOpen(false)
                              }}
                            >
                              None
                            </CommandItem>
                            {deals.map((d) => (
                              <CommandItem
                                key={d.id}
                                value={d.name}
                                onSelect={() => {
                                  field.onChange(d.id)
                                  form.setValue('property_mode', 'existing')
                                  form.setValue('property_id', d.property_id)
                                  setDealOpen(false)
                                }}
                              >
                                {d.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )
              }}
            />
            {dealId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Linked deal will sync ARV and projected profit into project cards.
              </p>
            ) : null}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="flex flex-wrap gap-3">
            <ModeButton
              active={mode === 'existing'}
              onClick={() => form.setValue('property_mode', 'existing', { shouldValidate: true })}
              disabled={properties.length === 0}
              label="Pick existing property"
              hint={
                properties.length === 0
                  ? 'No properties yet — create your first one below.'
                  : `${properties.length} on file`
              }
            />
            <ModeButton
              active={mode === 'new'}
              onClick={() => form.setValue('property_mode', 'new', { shouldValidate: true })}
              label="Create new property"
            />
          </div>

          {mode === 'existing' ? (
            <div className="space-y-2 max-w-xl">
              <Label>Property</Label>
              <Controller
                name="property_id"
                control={form.control}
                render={({ field }) => {
                  const selected = properties.find((p) => p.id === field.value)
                  return (
                    <Popover open={propOpen} onOpenChange={setPropOpen}>
                      <PopoverTrigger
                        render={
                          <Button type="button" variant="outline" className="w-full justify-between">
                            <span className="truncate">
                              {selected ? formatProp(selected) : 'Select a property…'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        }
                      />
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search by address…" />
                          <CommandList>
                            <CommandEmpty>No properties found.</CommandEmpty>
                            <CommandGroup>
                              {properties.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={formatProp(p)}
                                  onSelect={() => {
                                    field.onChange(p.id)
                                    setPropOpen(false)
                                  }}
                                >
                                  {formatProp(p)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )
                }}
              />
              {form.formState.errors.property_id?.message ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.property_id.message}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Address line 1"
                error={
                  (form.formState.errors as Record<string, { message?: string }>).address_line1
                    ?.message
                }
              >
                <Input {...form.register('address_line1')} />
              </Field>
              <Field label="Address line 2 (optional)">
                <Input {...form.register('address_line2')} />
              </Field>
              <Field
                label="City"
                error={
                  (form.formState.errors as Record<string, { message?: string }>).city?.message
                }
              >
                <Input {...form.register('city')} />
              </Field>
              <Field
                label="State"
                error={
                  (form.formState.errors as Record<string, { message?: string }>).state?.message
                }
              >
                <Input maxLength={2} {...form.register('state')} />
              </Field>
              <Field
                label="ZIP"
                error={
                  (form.formState.errors as Record<string, { message?: string }>).zip?.message
                }
              >
                <Input {...form.register('zip')} />
              </Field>
              <Field label="Property type">
                <Controller
                  name="property_type"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value ?? 'sfr'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sfr">Single-family</SelectItem>
                        <SelectItem value="duplex">Duplex</SelectItem>
                        <SelectItem value="triplex">Triplex</SelectItem>
                        <SelectItem value="quadplex">Quadplex</SelectItem>
                        <SelectItem value="townhome">Townhome</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Field label="Notes (optional)">
            <Textarea rows={4} {...form.register('notes')} />
          </Field>
        </CardContent>
      </Card>

      {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create project'}
        </Button>
      </div>
    </form>
  )
}

function ModeButton({
  active,
  onClick,
  label,
  hint,
  disabled,
}: {
  active: boolean
  onClick: () => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 min-w-[200px] flex-col rounded-md border p-4 text-left transition-colors ${
        active ? 'border-primary bg-muted/30' : 'border-border hover:bg-muted/30'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span className="font-medium">{label}</span>
      {hint ? <span className="mt-0.5 text-xs text-muted-foreground">{hint}</span> : null}
    </button>
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
