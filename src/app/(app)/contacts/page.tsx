import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/server'
import { ContactsManager } from './contacts-manager'
import type { ContractorRow } from '@/types/project'

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: contractors } = await supabase
    .from('contractor')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Contractors, vendors, and trade partners."
      />
      <ContactsManager contractors={(contractors ?? []) as ContractorRow[]} />
    </div>
  )
}
