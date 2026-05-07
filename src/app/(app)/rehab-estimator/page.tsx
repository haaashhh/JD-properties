import { Hammer } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function RehabEstimatorPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Rehab Estimator" description="Estimate rehab cost per scope tier and square footage." />
      <EmptyState
        icon={Hammer}
        title="Estimator coming soon"
        description="Cosmetic, heavy, and gut tiers with per-sqft rates land alongside the budget tracker (Module 4)."
      />
    </div>
  )
}
