import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace preferences and integrations." />
      <EmptyState
        icon={Settings}
        title="Settings coming soon"
        description="ARV % default, contingency %, alert thresholds, QuickBooks connection, and team management."
      />
    </div>
  )
}
