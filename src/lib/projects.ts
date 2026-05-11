import { PIPELINE_STAGES, type PipelineStage } from '@/lib/constants'

const stageLabel = new Map<string, string>(PIPELINE_STAGES.map((s) => [s.value, s.label]))

export function labelForStage(stage: string): string {
  return stageLabel.get(stage) ?? stage
}

export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)))
}

export function formatAddress(p: {
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
} | null | undefined): string {
  if (!p || !p.address_line1) return '—'
  const line2 = p.address_line2 ? ` ${p.address_line2}` : ''
  return `${p.address_line1}${line2}, ${p.city ?? ''}, ${p.state ?? ''}`
}

export type { PipelineStage }
