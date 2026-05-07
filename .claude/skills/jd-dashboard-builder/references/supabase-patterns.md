# Supabase Patterns — Data Operations, Auth & Storage

## Table of Contents
1. [Client Setup](#client-setup)
2. [Data Fetching (Server Components)](#data-fetching)
3. [Mutations (Server Actions)](#mutations)
4. [Real-Time Subscriptions](#real-time)
5. [File Uploads (Supabase Storage)](#file-uploads)
6. [Auth Patterns](#auth-patterns)

---

## Client Setup

Three clients for three contexts. Never mix them.

### Browser Client (client components only)
```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server Client (server components, server actions, route handlers)
```ts
// src/lib/supabase/server.ts
import { createServerClient as _createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options) } catch { /* read-only in RSC */ }
          })
        },
      },
    }
  )
}
```

### Admin Client (API routes that need to bypass RLS)
```ts
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
// ONLY use in API route handlers, NEVER in client components or server components
```

---

## Data Fetching

### Pattern: Server Component Fetch
```tsx
// src/app/(app)/projects/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function ProjectsPage() {
  const supabase = await createServerClient()

  const { data: projects, error } = await supabase
    .from('project')
    .select(`
      *,
      property ( address_line1, city, state ),
      deal_analysis ( arv_cents )
    `)
    .order('updated_at', { ascending: false })

  if (error) throw error  // caught by error.tsx boundary

  return <ProjectList projects={projects ?? []} />
}
```

### Pattern: Filtered Fetch with Organization Scope
RLS handles org scoping automatically. No need to filter by org_id in queries — the policy does it. But for clarity and defense-in-depth:

```tsx
const { data } = await supabase
  .from('project_expense')
  .select('*, budget_category(name)')
  .eq('project_id', projectId)
  .order('expense_date', { ascending: false })
  .limit(100)
```

### Pattern: Aggregated Dashboard Data
Use the `project_summary` view (defined in database-schema.md):

```tsx
const { data: summary } = await supabase
  .from('project_summary')
  .select('*')
  .in('pipeline_stage', ['purchased', 'in_rehab', 'punch_list', 'listed', 'under_contract_sale'])

const activeProjects = summary?.length ?? 0
const capitalDeployed = summary?.reduce((acc, p) => acc + (p.actual_purchase_price_cents ?? 0), 0) ?? 0
```

### Pattern: Loading States
Every page with async data needs a loading sibling:

```tsx
// src/app/(app)/projects/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}
```

### Pattern: Error Boundary
```tsx
// src/app/(app)/projects/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <p className="text-sm text-muted-foreground">Something went wrong loading this page.</p>
      <Button onClick={reset} className="mt-4">Try again</Button>
    </div>
  )
}
```

---

## Mutations

### Pattern: Server Action
```ts
// src/app/(app)/projects/[id]/budget/actions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const expenseSchema = z.object({
  budgetCategoryId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  expenseDate: z.string().date(),
  vendorName: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  paymentMethod: z.enum(['cash', 'check', 'credit_card', 'debit_card', 'lender_draw', 'transfer']),
})

export async function addExpense(projectId: string, formData: z.infer<typeof expenseSchema>) {
  const parsed = expenseSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('project_expense').insert({
    project_id: projectId,
    budget_category_id: parsed.data.budgetCategoryId,
    amount_cents: parsed.data.amountCents,
    expense_date: parsed.data.expenseDate,
    vendor_name: parsed.data.vendorName,
    description: parsed.data.description,
    payment_method: parsed.data.paymentMethod,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/budget`)
  return { success: true }
}
```

### Pattern: Calling Server Actions from Client
```tsx
'use client'
import { addExpense } from './actions'
import { toast } from 'sonner'

function ExpenseForm({ projectId }: { projectId: string }) {
  const [pending, setPending] = useState(false)

  async function handleSubmit(data: ExpenseInput) {
    setPending(true)
    const result = await addExpense(projectId, data)
    setPending(false)

    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Validation failed')
      return
    }
    toast.success('Expense added')
    // Form resets, page revalidates automatically via revalidatePath
  }
  // ...
}
```

### Pattern: Pipeline Stage Update (Optimistic)
```tsx
'use client'
import { useOptimistic } from 'react'

function PipelineBoard({ projects }: { projects: Project[] }) {
  const [optimistic, setOptimistic] = useOptimistic(projects)

  async function moveProject(projectId: string, newStage: string) {
    setOptimistic(prev =>
      prev.map(p => p.id === projectId ? { ...p, pipeline_stage: newStage } : p)
    )
    await updateProjectStage(projectId, newStage)  // server action
  }
  // render optimistic list
}
```

---

## Real-Time

Use Supabase Realtime for live updates on the budget page and dashboard.

### Pattern: Real-Time Hook
```tsx
// src/hooks/use-realtime.ts
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useRealtimeRefresh(table: string, filter?: string) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,  // e.g., 'project_id=eq.{uuid}'
        },
        () => {
          router.refresh()  // re-fetches server component data
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, filter, router])
}
```

### Usage
```tsx
// In a client component wrapper on the budget page
'use client'
export function BudgetRealtime({ projectId }: { projectId: string }) {
  useRealtimeRefresh('project_expense', `project_id=eq.${projectId}`)
  return null  // invisible component, just subscribes
}
```

---

## File Uploads

### Pattern: Signed URL Upload (Design Boards, Photos, Receipts)

**Step 1: Client requests a signed URL from API route**
```tsx
async function uploadFile(file: File, bucket: string, path: string) {
  // Get signed URL
  const res = await fetch('/api/uploads/signed-url', {
    method: 'POST',
    body: JSON.stringify({ bucket, path, contentType: file.type }),
  })
  const { signedUrl } = await res.json()

  // Upload directly to Supabase Storage
  await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  // Return the public URL
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
  return publicUrl
}
```

**Step 2: API route generates signed URL**
```ts
// src/app/api/uploads/signed-url/route.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const { bucket, path, contentType } = await req.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ signedUrl: data.signedUrl })
}
```

### File Upload UI Component
```tsx
'use client'
export function FileUpload({ bucket, pathPrefix, onUploaded }: {
  bucket: string; pathPrefix: string; onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = `${pathPrefix}/${Date.now()}-${file.name}`
      const url = await uploadFile(file, bucket, path)
      onUploaded(url)
      toast.success('File uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-8 hover:bg-muted/50 transition-colors">
      <input type="file" className="sr-only" onChange={handleFile} accept="image/*,.pdf" />
      {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
      <span className="ml-2 text-sm text-muted-foreground">
        {uploading ? 'Uploading...' : 'Click to upload'}
      </span>
    </label>
  )
}
```

---

## Auth Patterns

### Middleware (Route Protection)
```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from auth pages
  if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/quickbooks/webhook).*)'],
}
```

### Get Current User's Organization
```ts
// src/lib/supabase/helpers.ts
export async function getCurrentOrg(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: membership } = await supabase
    .from('organization_member')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) throw new Error('No organization')
  return { userId: user.id, orgId: membership.organization_id, role: membership.role }
}
```
