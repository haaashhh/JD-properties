import { Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectDrawsTabStub() {
  return (
    <EmptyState
      icon={Wallet}
      title="Lender draws coming soon"
      description="Sequential draws with inspection sign-off and budget-category line items."
    />
  )
}
