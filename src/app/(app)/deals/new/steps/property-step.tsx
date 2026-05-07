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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown } from 'lucide-react'
import type { DealFormFullValues } from '../deal-form'
import { useState } from 'react'

interface PropertyOption {
  id: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip: string
}

interface Props {
  form: UseFormReturn<DealFormFullValues>
  properties: PropertyOption[]
}

export function PropertyStep({ form, properties }: Props) {
  const mode = form.watch('property_mode')
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>

  return (
    <div className="space-y-6">
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
        <ExistingProperty form={form} properties={properties} />
      ) : (
        <NewProperty form={form} errors={errors} />
      )}
    </div>
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

function formatProp(p: PropertyOption) {
  return `${p.address_line1}${p.address_line2 ? ' ' + p.address_line2 : ''}, ${p.city}, ${p.state} ${p.zip}`
}

function ExistingProperty({
  form,
  properties,
}: {
  form: UseFormReturn<DealFormFullValues>
  properties: PropertyOption[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-2 max-w-xl">
      <Label>Property</Label>
      <Controller
        name="property_id"
        control={form.control}
        render={({ field }) => {
          const selected = properties.find((p) => p.id === field.value)
          return (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  >
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
                            setOpen(false)
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
        <p className="text-sm text-destructive">{form.formState.errors.property_id.message}</p>
      ) : null}
    </div>
  )
}

function NewProperty({
  form,
  errors,
}: {
  form: UseFormReturn<DealFormFullValues>
  errors: Record<string, { message?: string } | undefined>
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Address line 1" error={errors.address_line1?.message}>
        <Input {...form.register('address_line1')} />
      </Field>
      <Field label="Address line 2 (optional)">
        <Input {...form.register('address_line2')} />
      </Field>
      <Field label="City" error={errors.city?.message}>
        <Input {...form.register('city')} />
      </Field>
      <Field label="State" error={errors.state?.message}>
        <Input maxLength={2} {...form.register('state')} />
      </Field>
      <Field label="ZIP" error={errors.zip?.message}>
        <Input {...form.register('zip')} />
      </Field>
      <Field label="Property type">
        <Controller
          name="property_type"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value ?? 'sfr'} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
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
      <Field label="Square footage (optional)">
        <Input type="number" min="0" step="1" {...form.register('sqft')} />
      </Field>
      <Field label="Year built (optional)">
        <Input type="number" min="1800" max="2099" step="1" {...form.register('year_built')} />
      </Field>
      <Field label="Bedrooms (optional)">
        <Input type="number" min="0" step="0.5" {...form.register('bedrooms')} />
      </Field>
      <Field label="Bathrooms (optional)">
        <Input type="number" min="0" step="0.5" {...form.register('bathrooms')} />
      </Field>
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
