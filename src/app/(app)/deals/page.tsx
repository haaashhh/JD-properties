import { Calculator } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Deal Analyzer" description="Run flip and BRRRR analyses on potential deals." />
      <EmptyState
        icon={Calculator}
        title="No deals yet"
        description="The full analyzer arrives in Module 2 — ARV, MPP, ROI, comp management, and traffic-light scoring."
        action={{ label: 'Run a deal', href: '/deals/new' }}
      />
    </div>
  )
}
