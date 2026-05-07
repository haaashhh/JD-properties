import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Financial reports across all projects." />
      <EmptyState
        icon={BarChart3}
        title="Reports coming soon"
        description="P&L per project, portfolio summary, and tax export will live here."
      />
    </div>
  )
}
