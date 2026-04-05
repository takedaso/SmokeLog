'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SliderInput from '@/components/SliderInput'
import SituationTags from '@/components/SituationTags'
import { saveCraving, getSettings, updateCraving } from '@/lib/db'
import { CravingRecord, AppSettings } from '@/lib/types'
import { DANGER_CARDS, TIP_CARDS, shuffled } from '@/lib/cards'

type Step = 'form' | 'choice' | 'done'

// ── カウントダウン画面（並列表示） ────────────────────────────
function CountdownTimer({ onResist, onSmoke }: { onResist: () => void; onSmoke: () => void }) {
  const TOTAL = 300
  const DANGER_INTERVAL = 30 // 30秒ごとにDANGERカード切り替え
  const TIP_INTERVAL = 25    // 25秒ごとにTIPカード切り替え

  const [seconds, setSeconds] = useState(TOTAL)
  const [dangers] = useState(() => shuffled(DANGER_CARDS))
  const [tips] = useState(() => shuffled(TIP_CARDS))
  const [dangerIdx, setDangerIdx] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)
  const [survived, setSurvived] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          setSurvived(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [])

  // 経過時間に応じて各カードのインデックスを更新
  const elapsed = TOTAL - seconds
  useEffect(() => {
    setDangerIdx(Math.floor(elapsed / DANGER_INTERVAL) % dangers.length)
    setTipIdx(Math.floor(elapsed / TIP_INTERVAL) % tips.length)
  }, [elapsed, dangers.length, tips.length])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const progress = (elapsed / TOTAL) * 100
  const danger = dangers[dangerIdx]
  const tip = tips[tipIdx]

  if (survived) {
    return (
      <div className="flex-1 px-5 py-8 flex flex-col gap-4 items-center justify-center text-center">
        <div className="text-7xl mb-2">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800">5分、乗り越えました！</h2>
        <p className="text-gray-500 text-sm">クレービングのピークを越えました。<br />あなたは本当に強い。</p>
        <button onClick={onResist} className="mt-4 w-full bg-green-500 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-green-100 active:scale-95 transition-all">
          我慢できた！ 💪
        </button>
        <button onClick={onSmoke} className="w-full bg-white border-2 border-orange-300 text-orange-600 font-semibold py-4 rounded-2xl text-base active:scale-95 transition-all">
          吸ってしまった…
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 px-5 py-4 flex flex-col gap-3">
      {/* カウントダウン */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-4 text-center text-white">
        <p className="text-white/70 text-xs mb-1">クレービングのピークまで</p>
        <p className="text-4xl font-bold tracking-tight tabular-nums">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </p>
        <div className="mt-2 bg-white/20 rounded-full h-1.5">
          <div
            className="bg-white rounded-full h-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ⚠ 知っておくべき現実 */}
      {danger && (
        <div className="rounded-2xl p-4 flex flex-col bg-gray-900 text-white">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 self-start mb-2">
            ⚠ 知っておくべき現実
          </span>
          <p className="text-xl mb-1">{danger.emoji}</p>
          <p className="font-bold text-sm text-white mb-1">{danger.title}</p>
          <p className="text-white/75 text-xs leading-relaxed">{danger.body}</p>
        </div>
      )}

      {/* ✅ 今すぐできること */}
      {tip && (
        <div className="rounded-2xl p-4 flex flex-col bg-emerald-900 text-white">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-300 self-start mb-2">
            ✅ 今すぐできること
          </span>
          <p className="text-xl mb-1">{tip.emoji}</p>
          <p className="font-bold text-sm text-white mb-1">{tip.title}</p>
          <p className="text-white/75 text-xs leading-relaxed">{tip.body}</p>
        </div>
      )}

      {/* ボタン */}
      <button onClick={onResist} className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-green-100 transition-all">
        我慢できた！ 💪
      </button>
      <button onClick={onSmoke} className="w-full bg-white border-2 border-orange-300 hover:bg-orange-50 active:scale-95 text-orange-600 font-semibold py-3 rounded-2xl text-sm transition-all">
        吸ってしまった…
      </button>
      <p className="text-center text-gray-400 text-xs -mt-1">タイマーを待たなくてもOK</p>
    </div>
  )
}

// ── メインページ ──────────────────────────────────────────
export default function RecordPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings>({ phase: 'preparation' })
  const [cravingScore, setCravingScore] = useState(5)
  const [expectationScore, setExpectationScore] = useState(5)
  const [situation, setSituation] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const id = crypto.randomUUID()
      const record: CravingRecord = {
        id,
        timestamp: new Date().toISOString(),
        cravingScore,
        expectationScore,
        situation,
        memo: memo.trim() || undefined,
        phase: settings.phase,
      }
      await saveCraving(record)
      setSavedId(id)
      setStep('choice')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleResist = useCallback(async () => {
    if (!savedId) return
    await updateCraving(savedId, {
      result: { resisted: true, recordedAt: new Date().toISOString() },
    })
    setStep('done')
  }, [savedId])

  const handleSmoke = useCallback(() => {
    if (!savedId) return
    router.push(`/result/${savedId}`)
  }, [savedId, router])

  if (step === 'choice') {
    return (
      <div className="min-h-full flex flex-col">
        <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">記録しました</h1>
          <p className="text-gray-500 text-sm mt-0.5">5分だけ待ってみましょう</p>
        </div>
        <CountdownTimer onResist={handleResist} onSmoke={handleSmoke} />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-5 pb-20">
        <div className="text-center">
          <div className="text-7xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">よく頑張りました！</h2>
          <p className="text-gray-500 text-sm mb-8">
            記録が保存されました。<br />この積み重ねが禁煙成功につながります。
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-purple-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-purple-200 active:scale-95 transition-all"
          >
            ホームへ戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-400 mb-3 flex items-center gap-1 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </button>
        <h1 className="text-xl font-bold text-gray-800">クレービング記録</h1>
        <p className="text-gray-400 text-xs mt-0.5">今の気持ちを正直に記録しましょう</p>
      </div>

      <div className="px-5 py-6 space-y-8">
        <SliderInput
          label="吸いたい気持ちの強さ"
          subLabel="今どのくらい吸いたいですか？"
          value={cravingScore}
          onChange={setCravingScore}
          lowLabel="全然ない"
          highLabel="我慢できない"
          color="purple"
        />
        <SliderInput
          label="吸ったら楽になれると思う度合い"
          subLabel="吸ったらどのくらいスッキリすると思いますか？"
          value={expectationScore}
          onChange={setExpectationScore}
          lowLabel="あまり思わない"
          highLabel="絶対スッキリする"
          color="orange"
        />
        <SituationTags selected={situation} onChange={setSituation} />
        <div className="space-y-2">
          <label className="font-semibold text-gray-800">
            メモ <span className="text-gray-400 font-normal text-sm">（任意）</span>
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="今の状況や気持ちを書いてみましょう"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-purple-200 transition-all disabled:opacity-60"
        >
          {saving ? '保存中...' : '記録する'}
        </button>
      </div>
    </div>
  )
}
