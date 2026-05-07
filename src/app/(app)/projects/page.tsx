import { FolderKanban } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Pipeline kanban across every active flip." />
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="The pipeline kanban with drag-and-drop stage management arrives in Module 3."
      />
    </div>
  )
}
