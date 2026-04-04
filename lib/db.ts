import { createClient } from './supabase/client'
import { CravingRecord, AppSettings } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecord(row: any): CravingRecord {
  const hasResult = row.resisted !== null && row.resisted !== undefined
  return {
    id: row.id,
    timestamp: row.timestamp,
    cravingScore: row.craving_score,
    expectationScore: row.expectation_score,
    situation: row.situation ?? [],
    memo: row.memo ?? undefined,
    phase: row.phase,
    result: hasResult
      ? {
          resisted: row.resisted,
          satisfactionScore: row.satisfaction_score ?? undefined,
          recordedAt: row.result_recorded_at,
          memo: row.result_memo ?? undefined,
        }
      : undefined,
  }
}

export async function getCravings(): Promise<CravingRecord[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cravings')
    .select('*')
    .order('timestamp', { ascending: true })

  if (error) throw error
  return (data ?? []).map(rowToRecord)
}

export async function saveCraving(record: CravingRecord): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('cravings').insert({
    id: record.id,
    user_id: user.id,
    timestamp: record.timestamp,
    craving_score: record.cravingScore,
    expectation_score: record.expectationScore,
    situation: record.situation,
    memo: record.memo ?? null,
    phase: record.phase,
  })

  if (error) throw error
}

export async function updateCraving(id: string, updates: Partial<CravingRecord>): Promise<void> {
  const supabase = createClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.result !== undefined) {
    dbUpdates.resisted = updates.result.resisted
    dbUpdates.satisfaction_score = updates.result.satisfactionScore ?? null
    dbUpdates.result_recorded_at = updates.result.recordedAt
    dbUpdates.result_memo = updates.result.memo ?? null
  }

  const { error } = await supabase.from('cravings').update(dbUpdates).eq('id', id)
  if (error) throw error
}

export async function getCravingById(id: string): Promise<CravingRecord | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cravings')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? rowToRecord(data) : null
}

export async function getSettings(): Promise<AppSettings> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { phase: 'preparation' }

  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return { phase: 'preparation' }
  return {
    phase: data.phase as 'preparation' | 'quitting',
    quitDate: data.quit_date ?? undefined,
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('user_settings').upsert({
    user_id: user.id,
    phase: settings.phase,
    quit_date: settings.quitDate ?? null,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}
