'use client'

import Link from 'next/link'
import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { labelForStage } from '@/lib/projects'
import { StageAgingDot } from './stage-aging-dot'

export interface ProjectCardData {
  id: string
  name: string
  pipeline_stage: string
  stage_changed_at: string | null
  target_close_date: string | null
  property_address: string
  total_budget_cents: number | null
  total_spent_cents: number | null
  projected_net_profit_cents: number | null
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { stage: project.pipeline_stage },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined

  const spent = project.total_spent_cents ?? 0
  const budget = project.total_budget_cents ?? 0
  const progress = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-md border bg-card p-3 shadow-sm transition-shadow',
        isDragging && 'opacity-60 shadow-lg cursor-grabbing'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="flex-1 text-left cursor-grab focus:outline-none"
          aria-label={`Drag ${project.name}`}
        >
          <p className="line-clamp-2 text-sm font-medium leading-tight">{project.name}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {project.property_address}
          </p>
        </button>
        <StageAgingDot stageChangedAt={project.stage_changed_at} className="mt-1" />
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{labelForStage(project.pipeline_stage)}</span>
          {project.target_close_date ? (
            <span>Target {formatDate(project.target_close_date)}</span>
          ) : null}
        </div>
        {budget > 0 ? (
          <div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{formatCurrency(spent)} of {formatCurrency(budget)}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
        {project.projected_net_profit_cents != null ? (
          <p>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Projected {formatCurrency(project.projected_net_profit_cents)}
            </Badge>
          </p>
        ) : null}
      </div>

      <Link
        href={`/projects/${project.id}`}
        className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
      >
        Open project →
      </Link>
    </div>
  )
}
