import { Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectBudgetTabStub() {
  return (
    <EmptyState
      icon={Wallet}
      title="Budget coming in Module 4"
      description="Budget vs actuals table, expense entry, QuickBooks reconciliation."
    />
  )
}
