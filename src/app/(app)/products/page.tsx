import { Library } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Product Library" description="Reusable product catalog with shoppable links." />
      <EmptyState
        icon={Library}
        title="Library is empty"
        description="Add finishes, fixtures, and materials in Module 7 — designers can pull from this catalog into project rooms."
      />
    </div>
  )
}
