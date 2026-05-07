# Form Patterns — Validation, Server Actions & User Input

## Table of Contents
1. [Form Architecture](#form-architecture)
2. [Validation with Zod](#validation)
3. [Multi-Step Forms](#multi-step-forms)
4. [Common Input Patterns](#common-inputs)
5. [Feedback & Error Handling](#feedback)

---

## Form Architecture

All forms follow this pattern:
1. **Zod schema** defines validation (shared between client + server)
2. **React Hook Form** manages client-side state and UX
3. **Server Action** handles submission, validates again, writes to DB
4. **Toast** confirms success or shows error

### Dependencies
```bash
npm install react-hook-form @hookform/resolvers zod sonner
```

### Standard Form Template
```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { someAction } from './actions'

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  amount: z.number().positive('Must be positive'),
})
type FormValues = z.infer<typeof schema>

export function MyForm({ projectId }: { projectId: string }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', amount: 0 },
  })

  async function onSubmit(values: FormValues) {
    const result = await someAction(projectId, values)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Saved!')
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}
```

---

## Validation

### Shared Schemas
Put schemas in a shared location so server actions and forms use the same rules:

```ts
// src/types/schemas/expense.ts
import { z } from 'zod'

export const expenseSchema = z.object({
  budgetCategoryId: z.string().uuid('Select a category'),
  amountCents: z.number().int().positive('Amount must be positive'),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  vendorName: z.string().min(1, 'Vendor is required').max(200),
  description: z.string().max(500).optional(),
  paymentMethod: z.enum(['cash', 'check', 'credit_card', 'debit_card', 'lender_draw', 'transfer']),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
```

### Server Action Validation Pattern
Always re-validate on the server — client validation is UX, server validation is security:

```ts
'use server'
export async function addExpense(projectId: string, raw: unknown) {
  const parsed = expenseSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Invalid input', fields: parsed.error.flatten().fieldErrors }
  }
  // ... proceed with parsed.data
}
```

---

## Multi-Step Forms

The Deal Analyzer uses a multi-step form. Pattern:

```tsx
'use client'
const STEPS = ['Property Details', 'Analysis Inputs', 'Costs & Financing'] as const

export function DealForm() {
  const [step, setStep] = useState(0)
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: { /* all fields */ },
    mode: 'onTouched',  // validate on blur
  })

  function nextStep() {
    // Validate only current step's fields before advancing
    const fieldsForStep = STEP_FIELDS[step]
    form.trigger(fieldsForStep).then((valid) => {
      if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1))
    })
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i < step && setStep(i)}
            className={cn(
              'flex items-center gap-2 text-sm',
              i === step && 'font-semibold text-foreground',
              i < step && 'text-blue-600 cursor-pointer',
              i > step && 'text-muted-foreground'
            )}
          >
            <span className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs',
              i === step && 'bg-blue-600 text-white',
              i < step && 'bg-blue-100 text-blue-600',
              i > step && 'bg-muted text-muted-foreground'
            )}>
              {i < step ? '✓' : i + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {step === 0 && <PropertyFields form={form} />}
          {step === 1 && <AnalysisFields form={form} />}
          {step === 2 && <CostFields form={form} />}

          <div className="flex justify-between mt-6">
            {step > 0 && <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
            {step < STEPS.length - 1
              ? <Button type="button" onClick={nextStep}>Next</Button>
              : <Button type="submit" disabled={form.formState.isSubmitting}>Analyze Deal</Button>
            }
          </div>
        </form>
      </Form>
    </div>
  )
}
```

---

## Common Inputs

### Currency Input
See `ui-patterns.md` for the `CurrencyInput` component. Usage in forms:
```tsx
<FormField
  name="rehabEstimate"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Rehab Estimate</FormLabel>
      <FormControl>
        <CurrencyInput value={field.value} onChange={field.onChange} placeholder="0.00" />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Percentage Input
```tsx
export function PercentageInput({ value, onChange, ...props }: {
  value: number; onChange: (v: number) => void
} & Omit<InputProps, 'value' | 'onChange'>) {
  return (
    <div className="relative">
      <Input
        {...props}
        type="number"
        step="0.01"
        min="0"
        max="100"
        className="pr-8"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
    </div>
  )
}
```

### Select with Enum
```tsx
<FormField
  name="pipelineStage"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Stage</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger><SelectValue /></SelectTrigger>
        </FormControl>
        <SelectContent>
          {PIPELINE_STAGES.map((stage) => (
            <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Feedback

### Toast Setup
Add `<Toaster />` to root layout:
```tsx
// src/app/layout.tsx
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html><body>
      {children}
      <Toaster position="bottom-right" richColors />
    </body></html>
  )
}
```

### Standard Toast Usage
```ts
toast.success('Expense added successfully')
toast.error('Failed to save — please try again')
toast.loading('Syncing with QuickBooks...')
toast.dismiss()  // dismiss loading toast when done
```

### Inline Field Errors
Handled automatically by `<FormMessage />` from react-hook-form + shadcn/ui. Shows validation error text below the field in red.

### Page-Level Error States
For API failures that aren't field-specific:
```tsx
{error && (
  <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
    {error}
  </div>
)}
```
