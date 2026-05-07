import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/server'
import { EditDealForm } from './edit-deal-form'

export default async function EditDealPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: deal, error } = await supabase
    .from('deal_analysis')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !deal) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/deals/${id}`} className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to deal
        </Link>
      </div>
      <PageHeader title="Edit analysis" description={deal.name ?? 'Edit deal'} />
      <EditDealForm dealId={id} initialDeal={deal} />
    </div>
  )
}
