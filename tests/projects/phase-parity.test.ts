import { describe, expect, it } from 'vitest'
import { PIPELINE_PHASES, phaseForStage, type PipelineStage } from '@/lib/constants'
import { adminClient, getTestOrgAndUser } from '../db/setup'

// Verifies that the TS PIPELINE_PHASES map matches the SQL CASE expression
// in project_summary.pipeline_phase. If anyone edits one without the other
// the kanban will silently group projects under the wrong phase.

const allStages: PipelineStage[] = [
  'lead',
  'analyzing',
  'offer_made',
  'under_contract',
  'purchased',
  'in_rehab',
  'punch_list',
  'listed',
  'under_contract_sale',
  'sold',
  'portfolio',
]

const cleanup: Array<() => Promise<void>> = []

describe('pipeline_phase TS↔SQL parity', () => {
  it('every stage maps to exactly one phase in PIPELINE_PHASES', () => {
    const seen = new Set<string>()
    for (const stages of Object.values(PIPELINE_PHASES)) {
      for (const stage of stages) {
        expect(seen.has(stage), `${stage} appears in multiple phases`).toBe(false)
        seen.add(stage)
      }
    }
    for (const stage of allStages) {
      expect(seen.has(stage), `${stage} missing from PIPELINE_PHASES`).toBe(true)
    }
  })

  it('SQL CASE expression matches the TS mapping for every stage', async () => {
    const { admin, organizationId, userId } = await getTestOrgAndUser()

    // Seed one property to attach throwaway projects to.
    const { data: property } = await admin
      .from('property')
      .insert({
        organization_id: organizationId,
        address_line1: `Phase parity ${Date.now()}`,
        city: 'Austin',
        state: 'TX',
        zip: '78701',
      })
      .select('id')
      .single()
    if (!property) throw new Error('seed property insert failed')
    cleanup.push(async () => {
      await adminClient().from('property').delete().eq('id', property.id)
    })

    for (const stage of allStages) {
      const { data: project, error } = await admin
        .from('project')
        .insert({
          organization_id: organizationId,
          property_id: property.id,
          name: `parity-${stage}`,
          pipeline_stage: stage,
          created_by: userId,
        })
        .select('id')
        .single()
      if (error || !project) throw error ?? new Error('project insert failed')

      const { data: summary } = await admin
        .from('project_summary')
        .select('pipeline_phase')
        .eq('id', project.id)
        .single()

      const tsPhase = phaseForStage(stage)
      expect(
        summary?.pipeline_phase,
        `stage=${stage}: TS=${tsPhase} SQL=${summary?.pipeline_phase}`
      ).toBe(tsPhase)

      // Clean up immediately (each project is throwaway).
      await admin.from('project').delete().eq('id', project.id)
    }

    for (const fn of cleanup.splice(0)) await fn()
  })
})
