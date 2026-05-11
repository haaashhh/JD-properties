import Link from 'next/link'
import { FolderKanban, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { createClient } from '@/lib/supabase/server'
import { formatAddress } from '@/lib/projects'
import { PipelineBoard } from '@/components/projects/pipeline-board'
import type { ProjectCardData } from '@/components/projects/project-card'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_summary')
    .select(
      `id, name, pipeline_stage, stage_changed_at, target_close_date,
       address_line1, address_line2, city, state,
       total_budget_cents, total_spent_cents, projected_net_profit_cents`
    )
    .neq('status', 'cancelled')
    .order('stage_changed_at', { ascending: false })

  const projects: ProjectCardData[] = (data ?? []).map((row) => ({
    id: row.id ?? '',
    name: row.name ?? '',
    pipeline_stage: row.pipeline_stage ?? 'lead',
    stage_changed_at: row.stage_changed_at,
    target_close_date: row.target_close_date,
    property_address: formatAddress(row),
    total_budget_cents: row.total_budget_cents,
    total_spent_cents: row.total_spent_cents,
    projected_net_profit_cents: row.projected_net_profit_cents,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Drag deals across phases. Each phase groups the underlying pipeline stages."
        actions={
          <Button
            nativeButton={false}
            render={
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                New project
              </Link>
            }
          />
        }
      />

      {error ? (
        <p className="text-sm text-destructive">Could not load projects: {error.message}</p>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project directly, or promote a saved deal analysis from /deals."
          action={{ label: 'New project', href: '/projects/new' }}
        />
      ) : (
        <PipelineBoard initialProjects={projects} />
      )}
    </div>
  )
}
