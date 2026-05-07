import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Project documents, contracts, and uploads." />
      <EmptyState
        icon={FileText}
        title="Document storage coming soon"
        description="Documents are uploaded per project once the projects module ships (Module 3)."
      />
    </div>
  )
}
