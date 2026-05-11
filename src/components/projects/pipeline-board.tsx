'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import {
  PIPELINE_PHASES,
  PIPELINE_PHASE_LABELS,
  type PipelinePhase,
  type PipelineStage,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import { labelForStage } from '@/lib/projects'
import { moveProjectStage } from '@/app/(app)/projects/actions'
import { ProjectCard, type ProjectCardData } from './project-card'

interface Props {
  initialProjects: ProjectCardData[]
}

const PHASES: PipelinePhase[] = ['acquisition', 'rehab', 'listing', 'sold']

export function PipelineBoard({ initialProjects }: Props) {
  const [projects, setProjects] = useState(initialProjects)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const byPhase = useMemo(() => {
    const map: Record<PipelinePhase, ProjectCardData[]> = {
      acquisition: [],
      rehab: [],
      listing: [],
      sold: [],
    }
    for (const project of projects) {
      const phase = phaseOf(project.pipeline_stage)
      if (phase) map[phase].push(project)
    }
    return map
  }, [projects])

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const projectId = String(event.active.id)
    const targetStage = event.over?.id ? String(event.over.id) : null
    if (!targetStage) return

    const original = projects.find((p) => p.id === projectId)
    if (!original || original.pipeline_stage === targetStage) return

    // Optimistic UI: mutate locally first.
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              pipeline_stage: targetStage,
              stage_changed_at: new Date().toISOString(),
            }
          : p
      )
    )

    startTransition(async () => {
      const result = await moveProjectStage(projectId, targetStage)
      if ('error' in result) {
        // Roll back.
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? original : p))
        )
        toast.error(result.error)
      }
    })
  }

  const active = activeId ? projects.find((p) => p.id === activeId) ?? null : null

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid gap-4 lg:grid-cols-4">
        {PHASES.map((phase) => (
          <PhaseColumn key={phase} phase={phase} projects={byPhase[phase]} />
        ))}
      </div>
      <DragOverlay>{active ? <ProjectCard project={active} /> : null}</DragOverlay>
    </DndContext>
  )
}

function PhaseColumn({
  phase,
  projects,
}: {
  phase: PipelinePhase
  projects: ProjectCardData[]
}) {
  const stages = PIPELINE_PHASES[phase] as readonly PipelineStage[]
  return (
    <section className="flex flex-col rounded-lg border bg-muted/30">
      <header className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide">
          {PIPELINE_PHASE_LABELS[phase]}
        </h2>
        <span className="text-xs text-muted-foreground">{projects.length}</span>
      </header>
      <div className="flex flex-col gap-3 p-3">
        {stages.map((stage) => (
          <StageDropZone
            key={stage}
            stage={stage}
            projects={projects.filter((p) => p.pipeline_stage === stage)}
          />
        ))}
      </div>
    </section>
  )
}

function StageDropZone({
  stage,
  projects,
}: {
  stage: PipelineStage
  projects: ProjectCardData[]
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-md border border-dashed bg-background p-2 transition-colors',
        isOver && 'border-primary bg-primary/5'
      )}
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {labelForStage(stage)}
      </p>
      <div className="space-y-2">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {projects.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70 italic">Drop here</p>
        ) : null}
      </div>
    </div>
  )
}

function phaseOf(stage: string): PipelinePhase | null {
  for (const [phase, stages] of Object.entries(PIPELINE_PHASES) as [
    PipelinePhase,
    readonly string[],
  ][]) {
    if (stages.includes(stage)) return phase
  }
  return null
}
