import { Palette } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function DesignBoardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Design Boards" description="Mood boards organized by room, per project." />
      <EmptyState
        icon={Palette}
        title="Design boards coming soon"
        description="Replaces DesignFiles.co — uploads, presentations, approvals (Module 7)."
      />
    </div>
  )
}
