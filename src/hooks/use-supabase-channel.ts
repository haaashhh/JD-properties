'use client'

import { useEffect } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeStore } from '@/lib/stores/realtime-store'

type Row = Record<string, unknown> & { id: string }

interface Options {
  table: string
  filter?: string // e.g. "project_id=eq.<uuid>"
  schema?: string // defaults to "public"
}

// Subscribe to postgres_changes for a single table and merge events into the
// per-table Zustand map. Modules 3-5 will read from `useRealtimeStore` for
// per-row updates instead of triggering full route refreshes.
export function useSupabaseChannel({ table, filter, schema = 'public' }: Options) {
  const upsertRow = useRealtimeStore((s) => s.upsertRow)
  const removeRow = useRealtimeStore((s) => s.removeRow)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`realtime:${schema}:${table}:${filter ?? 'all'}`)
      .on(
        'postgres_changes',
        // The Supabase generic accepts a wide payload type; we narrow inside.
        { event: '*', schema, table, filter },
        (payload: RealtimePostgresChangesPayload<Row>) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Row | null
            if (oldRow?.id) removeRow(table, oldRow.id)
            return
          }
          const newRow = payload.new as Row | null
          if (newRow?.id) upsertRow(table, newRow)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [table, filter, schema, upsertRow, removeRow])
}
