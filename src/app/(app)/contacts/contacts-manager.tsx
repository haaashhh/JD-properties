'use client'

import { useEffect, useState, useTransition } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TRADE_TYPES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import {
  contractorInsertSchema,
  type ContractorInput,
} from '@/types/schemas/contractor'
import { addContractor, deleteContractor, updateContractor } from './actions'
import type { ContractorRow } from '@/types/project'

interface Props {
  contractors: ContractorRow[]
}

export function ContactsManager({ contractors }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {contractors.length} contractor{contractors.length === 1 ? '' : 's'} on file.
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New contractor
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  No contractors yet. Add the first one to start assigning milestones and tasks.
                </TableCell>
              </TableRow>
            ) : (
              contractors.map((c) => (
                <ContractorRowItem key={c.id} contractor={c} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewContractorDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}

function ContractorRowItem({ contractor }: { contractor: ContractorRow }) {
  const [pending, startTransition] = useTransition()

  const toggleActive = () => {
    startTransition(async () => {
      const result = await updateContractor(contractor.id, { is_active: !contractor.is_active })
      if ('error' in result) toast.error(result.error)
    })
  }
  const onDelete = () => {
    if (!confirm(`Delete ${contractor.name}?`)) return
    startTransition(async () => {
      const result = await deleteContractor(contractor.id)
      if ('error' in result) toast.error(result.error)
    })
  }

  // Computed client-side after hydration to avoid an SSR/CSR mismatch.
  const [insuranceWarn, setInsuranceWarn] = useState(false)
  useEffect(() => {
    setInsuranceWarn(
      contractor.insurance_expiry != null &&
        new Date(contractor.insurance_expiry).getTime() < Date.now()
    )
  }, [contractor.insurance_expiry])

  return (
    <TableRow className={contractor.is_active ? '' : 'opacity-60'}>
      <TableCell className="font-medium">
        {contractor.name}
        {contractor.company ? (
          <p className="text-xs text-muted-foreground">{contractor.company}</p>
        ) : null}
      </TableCell>
      <TableCell className="text-muted-foreground">{contractor.trade ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{contractor.phone ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">
        {contractor.email ?? '—'}
        {contractor.do_not_contact ? (
          <Badge variant="secondary" className="ml-1 text-xs">DNC</Badge>
        ) : null}
      </TableCell>
      <TableCell className={insuranceWarn ? 'text-destructive' : 'text-muted-foreground'}>
        {contractor.insurance_expiry ? formatDate(contractor.insurance_expiry) : '—'}
        {insuranceWarn ? <Badge variant="secondary" className="ml-1">Expired</Badge> : null}
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleActive}
          disabled={pending}
        >
          {contractor.is_active ? 'Active' : 'Inactive'}
        </Button>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" onClick={onDelete} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function NewContractorDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<ContractorInput>({
    resolver: zodResolver(contractorInsertSchema) as unknown as Resolver<ContractorInput>,
    defaultValues: {
      name: '',
      company: null,
      trade: null,
      phone: null,
      email: null,
      license_number: null,
      insurance_expiry: null,
      rating: null,
      preferred_contact: 'email',
      do_not_contact: false,
      is_active: true,
      notes: null,
    },
    mode: 'onTouched',
  })

  const errors = form.formState.errors as Record<string, { message?: string } | undefined>

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await addContractor(values)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Contractor added.')
      form.reset()
      onOpenChange(false)
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New contractor</DialogTitle>
          <DialogDescription>
            Used as the contact roster for milestones, tasks, and (later) lender draws.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message}>
              <Input {...form.register('name')} />
            </Field>
            <Field label="Company">
              <Input {...form.register('company')} />
            </Field>
            <Field label="Trade">
              <Controller
                name="trade"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v === '' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Phone">
              <Input type="tel" {...form.register('phone')} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...form.register('email')} />
            </Field>
            <Field label="License number">
              <Input {...form.register('license_number')} />
            </Field>
            <Field label="Insurance expiry">
              <Input type="date" {...form.register('insurance_expiry')} />
            </Field>
            <Field label="Rating (1-5)">
              <Input type="number" min="1" max="5" {...form.register('rating')} />
            </Field>
            <Field label="Preferred contact">
              <Controller
                name="preferred_contact"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save contractor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
