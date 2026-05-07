import { Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Contacts" description="Contractors, vendors, and trade partners." />
      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="Contractor CRUD (with trade, license, insurance, rating) lands in Module 3."
      />
    </div>
  )
}
