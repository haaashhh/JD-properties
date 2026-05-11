'use client'

import { useMemo, useState, useTransition } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/constants'
import { cn, formatDate } from '@/lib/utils'
import { taskInsertSchema, type TaskInput } from '@/types/schemas/task'
import { addTask, deleteTask, toggleTaskStatus, updateTask } from '../../app/(app)/projects/[id]/actions'
import type { ProjectTaskRow } from '@/types/project'

interface Props {
  projectId: string
  tasks: ProjectTaskRow[]
  milestones: { id: string; name: string }[]
  contractors: { id: string; name: string }[]
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-foreground',
  high: 'text-red-600 font-semibold',
}

export function TaskManager({ projectId, tasks, milestones, contractors }: Props) {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
        return true
      }),
    [tasks, statusFilter, priorityFilter]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterGroup
            label="Status"
            options={[{ value: 'all', label: 'All' }, ...TASK_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))]}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as TaskStatus | 'all')}
          />
          <FilterGroup
            label="Priority"
            options={[{ value: 'all', label: 'All' }, ...TASK_PRIORITIES.map((p) => ({ value: p, label: p }))]}
            value={priorityFilter}
            onChange={(v) => setPriorityFilter(v as TaskPriority | 'all')}
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showAdd ? 'Cancel' : 'Add task'}
        </Button>
      </div>

      {showAdd ? (
        <AddTaskForm
          projectId={projectId}
          milestones={milestones}
          contractors={contractors}
          onDone={() => setShowAdd(false)}
        />
      ) : null}

      <ul className="space-y-2">
        {filtered.length === 0 ? (
          <li className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No tasks match these filters.
          </li>
        ) : (
          filtered.map((t) => (
            <TaskRow
              key={t.id}
              projectId={projectId}
              task={t}
              milestones={milestones}
              contractors={contractors}
            />
          ))
        )}
      </ul>
    </div>
  )
}

function TaskRow({
  projectId,
  task,
  milestones,
  contractors,
}: {
  projectId: string
  task: ProjectTaskRow
  milestones: { id: string; name: string }[]
  contractors: { id: string; name: string }[]
}) {
  const [pending, startTransition] = useTransition()

  const onToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await toggleTaskStatus(task.id, projectId, checked ? 'done' : 'todo')
      if ('error' in result) toast.error(result.error)
    })
  }
  const onPriorityChange = (priority: TaskPriority) => {
    startTransition(async () => {
      const result = await updateTask(task.id, projectId, { priority })
      if ('error' in result) toast.error(result.error)
    })
  }
  const onDelete = () => {
    if (!confirm('Delete this task?')) return
    startTransition(async () => {
      const result = await deleteTask(task.id, projectId)
      if ('error' in result) toast.error(result.error)
    })
  }

  const milestone = milestones.find((m) => m.id === task.milestone_id)
  const contractor = contractors.find((c) => c.id === task.assigned_to_contractor)

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-md border bg-card p-3',
        task.status === 'done' && 'opacity-60'
      )}
    >
      <Checkbox
        checked={task.status === 'done'}
        onCheckedChange={(v) => onToggle(Boolean(v))}
        disabled={pending}
        className="mt-0.5"
        aria-label="Mark done"
      />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('font-medium', task.status === 'done' && 'line-through')}>
            {task.title}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={task.priority as TaskPriority}
              onValueChange={(v) => onPriorityChange(v as TaskPriority)}
              disabled={pending}
            >
              <SelectTrigger
                className={cn('h-7 w-24 text-xs', PRIORITY_STYLES[task.priority as TaskPriority])}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={onDelete} disabled={pending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {task.due_date ? <span>Due {formatDate(task.due_date)}</span> : null}
          {milestone ? <Badge variant="secondary">{milestone.name}</Badge> : null}
          {contractor ? <Badge variant="secondary">@{contractor.name}</Badge> : null}
          {task.category ? <Badge variant="secondary">{task.category.replace('_', ' ')}</Badge> : null}
        </div>
        {task.description ? (
          <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
        ) : null}
      </div>
    </li>
  )
}

function AddTaskForm({
  projectId,
  milestones,
  contractors,
  onDone,
}: {
  projectId: string
  milestones: { id: string; name: string }[]
  contractors: { id: string; name: string }[]
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<TaskInput>({
    resolver: zodResolver(taskInsertSchema) as unknown as Resolver<TaskInput>,
    defaultValues: {
      title: '',
      description: '',
      milestone_id: null,
      assigned_to_contractor: null,
      due_date: null,
      priority: 'medium',
      status: 'todo',
      category: null,
    },
    mode: 'onTouched',
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await addTask(projectId, values)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Task added.')
      form.reset()
      onDone()
    })
  })

  return (
    <form onSubmit={onSubmit} className="rounded-md border bg-muted/30 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" error={form.formState.errors.title?.message}>
          <Input placeholder="What needs to happen?" {...form.register('title')} />
        </Field>
        <Field label="Due date">
          <Input type="date" {...form.register('due_date')} />
        </Field>
        <Field label="Priority">
          <Controller
            name="priority"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Category">
          <Controller
            name="category"
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
                  {TASK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Milestone">
          <Controller
            name="milestone_id"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v === '' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {milestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Assign to contractor">
          <Controller
            name="assigned_to_contractor"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v === '' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save task'}
        </Button>
      </div>
    </form>
  )
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
              value === o.value ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
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
