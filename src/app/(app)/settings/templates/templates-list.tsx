'use client'

import { useTransition } from 'react'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  archiveBudgetTemplate,
  deleteBudgetTemplate,
  updateBudgetTemplateMeta,
} from './actions'

interface TemplateRow {
  id: string
  name: string
  scope_tier: string | null
  description: string | null
  is_archived: boolean
  organization_id: string | null
  line_count: number
}

interface Props {
  templates: TemplateRow[]
  canManage: boolean
}

const TIER_BADGE: Record<string, string> = {
  cosmetic: 'bg-emerald-100 text-emerald-700',
  heavy: 'bg-amber-100 text-amber-700',
  gut: 'bg-red-100 text-red-700',
  custom: 'bg-muted text-muted-foreground',
}

export function TemplatesList({ templates, canManage }: Props) {
  const system = templates.filter((t) => t.organization_id === null)
  const org = templates.filter((t) => t.organization_id !== null)

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          System templates
        </h2>
        <TemplatesTable rows={system} canManage={false} isSystem />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workspace templates {canManage ? '' : '(read-only)'}
        </h2>
        {org.length === 0 ? (
          <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No workspace templates yet. Save one from a project&apos;s budget page, or build one in
            the editor (coming soon).
          </p>
        ) : (
          <TemplatesTable rows={org} canManage={canManage} isSystem={false} />
        )}
      </section>
    </div>
  )
}

function TemplatesTable({
  rows,
  canManage,
  isSystem,
}: {
  rows: TemplateRow[]
  canManage: boolean
  isSystem: boolean
}) {
  if (rows.length === 0) return null

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead className="text-right">Lines</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TemplateRowItem key={t.id} template={t} canManage={canManage} isSystem={isSystem} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TemplateRowItem({
  template,
  canManage,
  isSystem,
}: {
  template: TemplateRow
  canManage: boolean
  isSystem: boolean
}) {
  const [pending, startTransition] = useTransition()

  const onArchive = () => {
    startTransition(async () => {
      const result = await archiveBudgetTemplate(template.id)
      if ('error' in result) toast.error(result.error)
      else toast.success('Template archived.')
    })
  }
  const onRestore = () => {
    startTransition(async () => {
      const result = await updateBudgetTemplateMeta(template.id, { is_archived: false })
      if ('error' in result) toast.error(result.error)
      else toast.success('Template restored.')
    })
  }
  const onDelete = () => {
    if (!confirm(`Delete "${template.name}" permanently?`)) return
    startTransition(async () => {
      const result = await deleteBudgetTemplate(template.id)
      if ('error' in result) toast.error(result.error)
      else toast.success('Template deleted.')
    })
  }

  return (
    <TableRow className={template.is_archived ? 'opacity-60' : ''}>
      <TableCell className="font-medium">
        {template.name}
        {template.description ? (
          <p className="text-xs text-muted-foreground">{template.description}</p>
        ) : null}
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={cn('capitalize', TIER_BADGE[template.scope_tier ?? 'custom'])}
        >
          {template.scope_tier ?? 'custom'}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {template.line_count}
      </TableCell>
      <TableCell>
        {isSystem ? (
          <Badge variant="secondary">System</Badge>
        ) : template.is_archived ? (
          <Badge variant="secondary">Archived</Badge>
        ) : (
          <Badge variant="secondary">Active</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        {canManage ? (
          <div className="flex items-center justify-end gap-1">
            {template.is_archived ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRestore}
                disabled={pending}
                aria-label="Restore"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={onArchive}
                disabled={pending}
                aria-label="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={pending}
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
