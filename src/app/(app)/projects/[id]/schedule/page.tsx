import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { MilestoneManager } from '@/components/projects/milestone-manager'
import type { ProjectMilestoneRow } from '@/types/project'

export default async function SchedulePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('project')
    .select('id')
    .eq('id', id)
    .single()
  if (!project) notFound()

  const [{ data: milestones }, { data: contractors }] = await Promise.all([
    supabase
      .from('project_milestone')
      .select('*')
      .eq('project_id', id)
      .order('sort_order', { ascending: true })
      .order('start_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('contractor')
      .select('id, name, trade')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <MilestoneManager
          projectId={id}
          milestones={(milestones ?? []) as ProjectMilestoneRow[]}
          contractors={contractors ?? []}
        />
      </CardContent>
    </Card>
  )
}
