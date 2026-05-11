import { afterEach, describe, expect, it } from 'vitest'
import { adminClient, getTestOrgAndUser } from '../db/setup'
import type { StageHistoryEntry } from '@/types/project'

const cleanup: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanup.length) {
    try {
      await cleanup.pop()?.()
    } catch {
      // best effort
    }
  }
})

function uniqueAddress(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)} St`
}

async function createProperty(orgId: string) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('property')
    .insert({
      organization_id: orgId,
      address_line1: uniqueAddress('Module3'),
      city: 'Austin',
      state: 'TX',
      zip: '78701',
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('property insert failed')
  cleanup.push(async () => {
    await adminClient().from('property').delete().eq('id', data.id)
  })
  return data.id
}

async function createProject(orgId: string, propertyId: string, stage = 'lead') {
  const admin = adminClient()
  const { data, error } = await admin
    .from('project')
    .insert({
      organization_id: orgId,
      property_id: propertyId,
      name: `M3 ${Date.now()}`,
      pipeline_stage: stage,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('project insert failed')
  cleanup.push(async () => {
    await adminClient().from('project').delete().eq('id', data.id)
  })
  return data.id
}

describe('project stage_history audit trigger', () => {
  it('seeds stage_history on INSERT with the initial stage', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const projectId = await createProject(organizationId, propertyId, 'lead')

    const admin = adminClient()
    const { data } = await admin
      .from('project')
      .select('stage_history')
      .eq('id', projectId)
      .single()
    const history = data?.stage_history as StageHistoryEntry[]
    expect(history).toHaveLength(1)
    expect(history[0]?.stage).toBe('lead')
  })

  it('appends a new entry whenever pipeline_stage changes (and only then)', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const projectId = await createProject(organizationId, propertyId, 'lead')
    const admin = adminClient()

    // No-op update — stage_history must NOT grow.
    await admin.from('project').update({ notes: 'noop' }).eq('id', projectId).throwOnError()
    const { data: noop } = await admin
      .from('project')
      .select('stage_history, stage_changed_at')
      .eq('id', projectId)
      .single()
    expect((noop?.stage_history as StageHistoryEntry[]).length).toBe(1)
    const stableChangedAt = noop?.stage_changed_at

    // Real transition.
    await admin
      .from('project')
      .update({ pipeline_stage: 'in_rehab' })
      .eq('id', projectId)
      .throwOnError()

    const { data: after } = await admin
      .from('project')
      .select('stage_history, stage_changed_at')
      .eq('id', projectId)
      .single()
    const history = after?.stage_history as StageHistoryEntry[]
    expect(history.length).toBe(2)
    expect(history[1]?.stage).toBe('in_rehab')
    expect(after?.stage_changed_at).not.toBe(stableChangedAt)
  })
})

describe('target_close_date generated column', () => {
  it('uses sale_date when set', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const admin = adminClient()
    const projectId = await createProject(organizationId, propertyId)
    await admin.from('project').update({ sale_date: '2026-09-01' }).eq('id', projectId).throwOnError()
    const { data } = await admin
      .from('project')
      .select('target_close_date')
      .eq('id', projectId)
      .single()
    expect(data?.target_close_date).toBe('2026-09-01')
  })

  it('falls back to listing_date + 45 when sale_date is null', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const admin = adminClient()
    const projectId = await createProject(organizationId, propertyId)
    await admin
      .from('project')
      .update({ listing_date: '2026-07-01', sale_date: null })
      .eq('id', projectId)
      .throwOnError()
    const { data } = await admin
      .from('project')
      .select('target_close_date')
      .eq('id', projectId)
      .single()
    expect(data?.target_close_date).toBe('2026-08-15')
  })

  it('falls back to rehab_end_date + 75 when listing/sale dates are null', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const admin = adminClient()
    const projectId = await createProject(organizationId, propertyId)
    await admin
      .from('project')
      .update({ rehab_end_date: '2026-04-01', listing_date: null, sale_date: null })
      .eq('id', projectId)
      .throwOnError()
    const { data } = await admin
      .from('project')
      .select('target_close_date')
      .eq('id', projectId)
      .single()
    expect(data?.target_close_date).toBe('2026-06-15')
  })
})

describe('milestone status → completed_at trigger', () => {
  it('sets completed_at when status flips to complete; clears when reverted', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const projectId = await createProject(organizationId, propertyId)
    const admin = adminClient()

    const { data: m } = await admin
      .from('project_milestone')
      .insert({
        project_id: projectId,
        organization_id: organizationId,
        name: 'Demo',
        status: 'not_started',
      })
      .select('id')
      .single()
    expect(m).toBeTruthy()

    await admin.from('project_milestone').update({ status: 'complete' }).eq('id', m!.id).throwOnError()
    const { data: after } = await admin
      .from('project_milestone')
      .select('completed_at')
      .eq('id', m!.id)
      .single()
    expect(after?.completed_at).not.toBeNull()

    await admin
      .from('project_milestone')
      .update({ status: 'in_progress' })
      .eq('id', m!.id)
      .throwOnError()
    const { data: reverted } = await admin
      .from('project_milestone')
      .select('completed_at')
      .eq('id', m!.id)
      .single()
    expect(reverted?.completed_at).toBeNull()
  })
})

describe('task and milestone org auto-population', () => {
  it('trg_milestone_set_org fills org_id when omitted', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const projectId = await createProject(organizationId, propertyId)
    const admin = adminClient()

    const { data, error } = await admin
      .from('project_milestone')
      .insert({
        project_id: projectId,
        name: 'Org auto',
        status: 'not_started',
      } as never)
      .select('id, organization_id')
      .single()
    expect(error).toBeNull()
    expect(data?.organization_id).toBe(organizationId)
  })

  it('trg_task_set_org fills org_id when omitted', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const projectId = await createProject(organizationId, propertyId)
    const admin = adminClient()

    const { data, error } = await admin
      .from('project_task')
      .insert({
        project_id: projectId,
        title: 'Test task',
      } as never)
      .select('id, organization_id')
      .single()
    expect(error).toBeNull()
    expect(data?.organization_id).toBe(organizationId)
  })
})

describe('project_summary rollups', () => {
  it('counts milestones complete/total and open tasks and photos', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const projectId = await createProject(organizationId, propertyId)
    const admin = adminClient()

    await admin
      .from('project_milestone')
      .insert([
        { project_id: projectId, organization_id: organizationId, name: 'a', status: 'complete' },
        { project_id: projectId, organization_id: organizationId, name: 'b', status: 'in_progress' },
        { project_id: projectId, organization_id: organizationId, name: 'c', status: 'not_started' },
      ])
      .throwOnError()

    await admin
      .from('project_task')
      .insert([
        { project_id: projectId, organization_id: organizationId, title: 't1', status: 'todo' },
        { project_id: projectId, organization_id: organizationId, title: 't2', status: 'in_progress' },
        { project_id: projectId, organization_id: organizationId, title: 't3', status: 'done' },
      ])
      .throwOnError()

    await admin
      .from('project_photo')
      .insert({
        project_id: projectId,
        organization_id: organizationId,
        storage_path: `${organizationId}/${projectId}/during/test.jpg`,
        phase: 'during',
      })
      .throwOnError()

    const { data: row } = await admin
      .from('project_summary')
      .select('milestones_total, milestones_complete, tasks_open, photos_count')
      .eq('id', projectId)
      .single()
    expect(row?.milestones_total).toBe(3)
    expect(row?.milestones_complete).toBe(1)
    expect(row?.tasks_open).toBe(2) // todo + in_progress, NOT done
    expect(row?.photos_count).toBe(1)
  })
})
