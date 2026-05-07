import { Calculator } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function NewDealPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Deal" description="Multi-step deal analyzer (Module 2)." />
      <EmptyState
        icon={Calculator}
        title="Analyzer not yet implemented"
        description="The deal-analyzer form lands in Module 2."
      />
    </div>
  )
}
