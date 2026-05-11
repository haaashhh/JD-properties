'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Bookmark, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { ApplyTemplateDialog } from '@/components/budget/apply-template-dialog'
import { saveTemplateFromProject } from '@/app/(app)/settings/templates/actions'

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
}

export function BudgetPageActions({
  projectId,
  defaultSqft,
  templates,
  existingCategoryIds,
}: Props) {
  const [applyOpen, setApplyOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [tier, setTier] = useState<'cosmetic' | 'heavy' | 'gut' | 'custom'>('custom')

  const onSave = () => {
    if (!name.trim()) {
      toast.error('Pick a template name.')
      return
    }
    startTransition(async () => {
      const result = await saveTemplateFromProject(projectId, name.trim(), tier)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Saved as template.')
      setSaveOpen(false)
      setName('')
    })
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setApplyOpen(true)} disabled={templates.length === 0}>
        <Layers className="h-4 w-4" />
        Apply template
      </Button>
      <Button variant="outline" onClick={() => setSaveOpen(true)} disabled={existingCategoryIds.size === 0}>
        <Bookmark className="h-4 w-4" />
        Save as template
      </Button>

      <ApplyTemplateDialog
        projectId={projectId}
        defaultSqft={defaultSqft}
        templates={templates}
        existingCategoryIds={existingCategoryIds}
        open={applyOpen}
        onOpenChange={setApplyOpen}
      />

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current budget as template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Template name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Standard Heavy Rehab"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Scope tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cosmetic">Cosmetic</SelectItem>
                  <SelectItem value="heavy">Heavy</SelectItem>
                  <SelectItem value="gut">Gut</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Each non-zero budget line becomes a flat-amount template line. Per-sqft scaling can be
              added afterward in /settings/templates.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={pending}>
              {pending ? 'Saving…' : 'Save template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
