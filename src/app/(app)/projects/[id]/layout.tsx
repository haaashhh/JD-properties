import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/server'
import { formatAddress, labelForStage } from '@/lib/projects'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/photos', label: 'Photos' },
  { href: '/budget', label: 'Budget' },
  { href: '/draws', label: 'Draws' },
  { href: '/design', label: 'Design' },
]

export default async function ProjectLayout(props: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('project')
    .select(
      `id, name, pipeline_stage, status, property:property_id(address_line1, address_line2, city, state, zip)`
    )
    .eq('id', id)
    .single()

  if (!project) notFound()

  const property = project.property as {
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state: string | null
    zip: string | null
  } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projects" className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          All projects
        </Link>
      </div>

      <PageHeader
        title={project.name ?? 'Project'}
        description={formatAddress(property)}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase">
              {labelForStage(project.pipeline_stage ?? 'lead')}
            </Badge>
            {project.status === 'cancelled' ? (
              <Badge variant="secondary">Archived</Badge>
            ) : null}
          </div>
        }
      />

      <nav className="flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => (
          <ProjectTabLink
            key={tab.href || 'overview'}
            href={`/projects/${id}${tab.href}`}
            exact={tab.href === ''}
            label={tab.label}
          />
        ))}
      </nav>

      <div>{props.children}</div>
    </div>
  )
}

function ProjectTabLink({
  href,
  label,
  exact,
}: {
  href: string
  label: string
  exact?: boolean
}) {
  // Server-rendered link; active state computed in client wrapper would
  // require usePathname. For now style is simple — the underline shows on
  // hover/active via :focus-within.
  void exact
  return (
    <Link
      href={href}
      className={cn(
        'border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors',
        'hover:border-primary/60 hover:text-foreground'
      )}
    >
      {label}
    </Link>
  )
}
