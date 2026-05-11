import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/server'
import { ProjectForm } from './project-form'

export default async function NewProjectPage(props: {
  searchParams: Promise<{ deal?: string }>
}) {
  const { deal: linkedDealId } = await props.searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_member')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const orgId = membership?.organization_id

  const [{ data: properties }, { data: deals }, { data: linkedDeal }] = await Promise.all([
    orgId
      ? supabase
          .from('property')
          .select('id, address_line1, address_line2, city, state, zip')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    orgId
      ? supabase
          .from('deal_analysis')
          .select('id, name, property_id')
          .eq('organization_id', orgId)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    linkedDealId
      ? supabase
          .from('deal_analysis')
          .select('id, name, property_id')
          .eq('id', linkedDealId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="New project"
        description="Open a project in the pipeline. Link an existing analysis or start fresh."
      />
      <ProjectForm
        properties={properties ?? []}
        deals={deals ?? []}
        linkedDeal={linkedDeal ?? null}
      />
    </div>
  )
}
