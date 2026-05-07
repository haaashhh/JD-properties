import { Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function LendersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Lenders & Draws" description="Hard-money draws and disbursement tracking." />
      <EmptyState
        icon={Wallet}
        title="Lender draws coming soon"
        description="Sequential draws with inspection sign-off and budget-category line items (Module 3+)."
      />
    </div>
  )
}
