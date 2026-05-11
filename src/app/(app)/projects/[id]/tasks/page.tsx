import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { TaskManager } from '@/components/projects/task-manager'
import type { ProjectTaskRow } from '@/types/project'

export default async function TasksPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('project')
    .select('id')
    .eq('id', id)
    .single()
  if (!project) notFound()

  const [{ data: tasks }, { data: milestones }, { data: contractors }] = await Promise.all([
    supabase
      .from('project_task')
      .select('*')
      .eq('project_id', id)
      .order('status', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('project_milestone')
      .select('id, name')
      .eq('project_id', id),
    supabase
      .from('contractor')
      .select('id, name')
      .eq('is_active', true),
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <TaskManager
          projectId={id}
          tasks={(tasks ?? []) as ProjectTaskRow[]}
          milestones={milestones ?? []}
          contractors={contractors ?? []}
        />
      </CardContent>
    </Card>
  )
}
