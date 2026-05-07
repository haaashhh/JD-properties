'use client'

import { create } from 'zustand'

// Per-table maps of locally-cached rows. Modules 3-5 plug their data here.
// Subscriptions wired by `useSupabaseChannel` merge incoming postgres_changes
// events into these maps without forcing a full route re-render.
type Row = Record<string, unknown> & { id: string }

interface RealtimeState {
  tables: Record<string, Map<string, Row>>
  upsertRow: (table: string, row: Row) => void
  removeRow: (table: string, id: string) => void
  hydrate: (table: string, rows: Row[]) => void
  clearTable: (table: string) => void
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  tables: {},
  upsertRow: (table, row) =>
    set((state) => {
      const next = new Map(state.tables[table] ?? [])
      next.set(row.id, row)
      return { tables: { ...state.tables, [table]: next } }
    }),
  removeRow: (table, id) =>
    set((state) => {
      const current = state.tables[table]
      if (!current) return state
      const next = new Map(current)
      next.delete(id)
      return { tables: { ...state.tables, [table]: next } }
    }),
  hydrate: (table, rows) =>
    set((state) => {
      const next = new Map<string, Row>()
      for (const row of rows) next.set(row.id, row)
      return { tables: { ...state.tables, [table]: next } }
    }),
  clearTable: (table) =>
    set((state) => {
      if (!state.tables[table]) return state
      const { [table]: _omit, ...rest } = state.tables
      void _omit
      return { tables: rest }
    }),
}))
