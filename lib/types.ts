export type Phase = 'preparation' | 'quitting'

export const SITUATION_LABELS: Record<string, string> = {
  'after-meal': '食後',
  'stress': 'ストレス',
  'bored': '暇',
  'drinking': '飲酒中',
  'work': '仕事中',
  'morning': '起床後',
  'driving': '運転中',
  'social': '人と会う',
}

export interface CravingRecord {
  id: string
  timestamp: string // ISO string
  cravingScore: number // 1-10
  expectationScore: number // 1-10
  situation: string[]
  memo?: string
  phase: Phase
  result?: {
    resisted: boolean
    satisfactionScore?: number // 1-10 (吸った場合のみ)
    recordedAt: string // ISO string
    memo?: string
  }
}

export interface AppSettings {
  quitDate?: string // ISO string
  phase: Phase
}
