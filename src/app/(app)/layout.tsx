import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? null
  const email = user.email ?? ''

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar email={email} fullName={fullName} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
