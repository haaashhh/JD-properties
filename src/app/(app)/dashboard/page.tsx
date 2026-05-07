import { LayoutDashboard } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome back"
        description="The dashboard arrives in Module 5 — KPIs, revenue, pipeline, recent activity."
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard coming soon"
        description="Once you've added a deal or a project, this page will show your active pipeline, capital deployed, projected profit, and ROI trends."
        action={{ label: 'Run a deal', href: '/deals/new' }}
      />
    </div>
  )
}
