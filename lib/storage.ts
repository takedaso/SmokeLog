import { CravingRecord, AppSettings } from './types'

const CRAVINGS_KEY = 'smoke_app_cravings'
const SETTINGS_KEY = 'smoke_app_settings'

export function getCravings(): CravingRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(CRAVINGS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveCraving(record: CravingRecord): void {
  const cravings = getCravings()
  cravings.push(record)
  localStorage.setItem(CRAVINGS_KEY, JSON.stringify(cravings))
}

export function updateCraving(id: string, updates: Partial<CravingRecord>): void {
  const cravings = getCravings()
  const index = cravings.findIndex((c) => c.id === id)
  if (index !== -1) {
    cravings[index] = { ...cravings[index], ...updates }
    localStorage.setItem(CRAVINGS_KEY, JSON.stringify(cravings))
  }
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return { phase: 'preparation' }
  try {
    const data = localStorage.getItem(SETTINGS_KEY)
    return data ? JSON.parse(data) : { phase: 'preparation' }
  } catch {
    return { phase: 'preparation' }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function exportToCSV(cravings: CravingRecord[]): string {
  const headers = [
    'id',
    'timestamp',
    'cravingScore',
    'expectationScore',
    'situation',
    'memo',
    'phase',
    'resisted',
    'satisfactionScore',
    'resultMemo',
    'resultRecordedAt',
  ]
  const rows = cravings.map((c) => [
    c.id,
    c.timestamp,
    c.cravingScore,
    c.expectationScore,
    c.situation.join('|'),
    c.memo ?? '',
    c.phase,
    c.result?.resisted ?? '',
    c.result?.satisfactionScore ?? '',
    c.result?.memo ?? '',
    c.result?.recordedAt ?? '',
  ])
  return [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
}
