'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { applyTemplate } from '@/lib/calculations/budget'
import { cn, formatCurrency } from '@/lib/utils'
import { applyBudgetTemplate } from '@/app/(app)/projects/[id]/budget/actions'
import { createClient } from '@/lib/supabase/client'

interface TemplateOption {
  id: string
  name: string
  scope_tier: string | null
  organization_id: string | null
}

interface Props {
  projectId: string
  defaultSqft: number | null
  templates: TemplateOption[]
  existingCategoryIds: Set<string>
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PreviewRow {
  budget_category_id: string
  category_name: string
  group_name: string
  estimated_cents: number
  existing: boolean
}

export function ApplyTemplateDialog({
  projectId,
  defaultSqft,
  templates,
  existingCategoryIds,
  open,
  onOpenChange,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [templateId, setTemplateId] = useState<string | ''>('')
  const [sqft, setSqft] = useState<number>(defaultSqft && defaultSqft > 0 ? defaultSqft : 1500)
  const [overwrite, setOverwrite] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[]>([])

  useEffect(() => {
    if (!templateId) {
      setPreview([])
      return
    }
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: lines } = await supabase
        .from('budget_template_line')
        .select(
          'budget_category_id, default_amount_cents, per_sqft_rate_cents, budget_category:budget_category_id(name, group_name)'
        )
        .eq('budget_template_id', templateId)
        .order('sort_order')

      if (cancelled || !lines) return
      const computed = applyTemplate(
        lines.map((l) => ({
          budget_category_id: l.budget_category_id,
          default_amount_cents: l.default_amount_cents,
          per_sqft_rate_cents: l.per_sqft_rate_cents,
        })),
        sqft
      )
      const previewRows: PreviewRow[] = computed.map((c) => {
        const original = lines.find((l) => l.budget_category_id === c.budget_category_id)
        const cat = original?.budget_category as { name: string; group_name: string } | null
        return {
          budget_category_id: c.budget_category_id,
          category_name: cat?.name ?? 'Uncategorized',
          group_name: cat?.group_name ?? 'other',
          estimated_cents: c.estimated_cents,
          existing: existingCategoryIds.has(c.budget_category_id),
        }
      })
      setPreview(previewRows)
    })()
    return () => {
      cancelled = true
    }
  }, [templateId, sqft, existingCategoryIds])

  const totals = useMemo(() => {
    const newRows = preview.filter((p) => !p.existing)
    const existingRows = preview.filter((p) => p.existing)
    return {
      total: preview.reduce((s, p) => s + p.estimated_cents, 0),
      newCount: newRows.length,
      existingCount: existingRows.length,
    }
  }, [preview])

  const onApply = () => {
    if (!templateId || sqft <= 0) return
    startTransition(async () => {
      const result = await applyBudgetTemplate(projectId, {
        template_id: templateId,
        sqft,
        overwrite,
      })
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(
        `Applied template: ${result.inserted} inserted, ${result.updated} updated.`
      )
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply budget template</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select
              value={templateId}
              onValueChange={(v) => setTemplateId(v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a template…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.organization_id == null ? ' · system' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Property sqft</Label>
            <Input
              type="number"
              min="100"
              max="50000"
              value={sqft}
              onChange={(e) => setSqft(Math.max(0, parseInt(e.target.value || '0', 10)))}
            />
            {defaultSqft != null && defaultSqft > 0 ? (
              <p className="text-xs text-muted-foreground">
                Property has {defaultSqft.toLocaleString()} sqft on file.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
          <Checkbox
            id="overwrite-toggle"
            checked={overwrite}
            onCheckedChange={(v) => setOverwrite(Boolean(v))}
          />
          <Label htmlFor="overwrite-toggle" className="text-sm font-normal">
            Overwrite existing budget lines (keeps notes; only updates estimated amount).
            Unchecked: new lines added, existing kept as-is.
          </Label>
        </div>

        {preview.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto rounded-md border">
            <div className="sticky top-0 flex items-center justify-between bg-muted/40 px-3 py-2 text-xs">
              <div className="flex gap-3">
                <Badge variant="secondary">{totals.newCount} new</Badge>
                <Badge variant="secondary">{totals.existingCount} existing</Badge>
              </div>
              <span className="font-medium">Total: {formatCurrency(totals.total)}</span>
            </div>
            <ul className="divide-y text-sm">
              {preview.map((p) => (
                <li
                  key={p.budget_category_id}
                  className={cn(
                    'flex items-center justify-between px-3 py-2',
                    p.existing && !overwrite && 'opacity-60'
                  )}
                >
                  <div>
                    <span className="font-medium">{p.category_name}</span>
                    <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {p.group_name}
                    </span>
                    {p.existing ? (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {overwrite ? 'will update' : 'skipped'}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        new
                      </Badge>
                    )}
                  </div>
                  <span className="tabular-nums">{formatCurrency(p.estimated_cents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : templateId ? (
          <p className="text-sm text-muted-foreground">Computing preview…</p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={pending || !templateId || sqft <= 0}>
            {pending ? 'Applying…' : 'Apply template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
