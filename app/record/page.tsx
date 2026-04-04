'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import SliderInput from '@/components/SliderInput'
import SituationTags from '@/components/SituationTags'
import { saveCraving, getSettings, updateCraving } from '@/lib/storage'
import { CravingRecord, AppSettings } from '@/lib/types'

type Step = 'form' | 'choice' | 'done'

export default function RecordPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings>({ phase: 'preparation' })
  const [cravingScore, setCravingScore] = useState(5)
  const [expectationScore, setExpectationScore] = useState(5)
  const [situation, setSituation] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  const handleSave = () => {
    const id = uuidv4()
    const record: CravingRecord = {
      id,
      timestamp: new Date().toISOString(),
      cravingScore,
      expectationScore,
      situation,
      memo: memo.trim() || undefined,
      phase: settings.phase,
    }
    saveCraving(record)
    setSavedId(id)

    if (settings.phase === 'quitting') {
      // 禁煙中はそのまま我慢として記録
      updateCraving(id, {
        result: { resisted: true, recordedAt: new Date().toISOString() },
      })
      setStep('done')
    } else {
      setStep('choice')
    }
  }

  const handleResist = () => {
    if (!savedId) return
    updateCraving(savedId, {
      result: { resisted: true, recordedAt: new Date().toISOString() },
    })
    setStep('done')
  }

  const handleSmoke = () => {
    if (!savedId) return
    router.push(`/result/${savedId}`)
  }

  if (step === 'choice') {
    return (
      <div className="min-h-full flex flex-col">
        <div className="bg-white px-5 pt-14 pb-6 border-b border-gray-100">
          <button onClick={() => router.back()} className="text-gray-400 mb-4 flex items-center gap-1 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
          <h1 className="text-xl font-bold text-gray-800">記録しました</h1>
          <p className="text-gray-500 text-sm mt-1">吸いましたか？</p>
        </div>

        <div className="flex-1 px-5 py-8 flex flex-col gap-4">
          <div className="bg-purple-50 rounded-2xl p-5 text-center mb-2">
            <p className="text-5xl mb-3">🧘</p>
            <p className="font-semibold text-purple-800">あと5分だけ待ってみましょう</p>
            <p className="text-purple-600 text-sm mt-1">クレービングは通常3〜5分でピークを越えます。<br />深呼吸しながら乗り越えましょう！</p>
          </div>

          <button
            onClick={handleResist}
            className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-green-100 transition-all"
          >
            我慢できた！ 💪
          </button>

          <button
            onClick={handleSmoke}
            className="w-full bg-white border-2 border-orange-300 hover:bg-orange-50 active:scale-95 text-orange-600 font-semibold py-4 rounded-2xl text-base transition-all"
          >
            吸ってしまった…
          </button>

          <p className="text-center text-gray-400 text-xs">
            どちらを選んでも記録が学習に使われます
          </p>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-5 pb-20">
        <div className="text-center">
          <div className="text-7xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">よく頑張りました！</h2>
          <p className="text-gray-500 text-sm mb-8">記録が保存されました。<br />この積み重ねが禁煙成功につながります。</p>
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
          className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-purple-200 transition-all"
        >
          記録する
        </button>
      </div>
    </div>
  )
}
