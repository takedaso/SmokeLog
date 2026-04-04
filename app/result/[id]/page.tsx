'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import SliderInput from '@/components/SliderInput'
import { getCravings, updateCraving } from '@/lib/storage'
import { CravingRecord } from '@/lib/types'

export default function ResultPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [record, setRecord] = useState<CravingRecord | null>(null)
  const [satisfactionScore, setSatisfactionScore] = useState(5)
  const [memo, setMemo] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const cravings = getCravings()
    const found = cravings.find((c) => c.id === id)
    if (found) setRecord(found)
  }, [id])

  const handleSave = () => {
    if (!record) return
    updateCraving(id, {
      result: {
        resisted: false,
        satisfactionScore,
        recordedAt: new Date().toISOString(),
        memo: memo.trim() || undefined,
      },
    })
    setSaved(true)
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-gray-400">記録が見つかりません</p>
      </div>
    )
  }

  const gap = record.expectationScore - satisfactionScore
  const gapAbs = Math.abs(gap)

  const gapMessage = () => {
    if (gap <= -2) return { emoji: '😮', text: `期待より${gapAbs}点も上回りました！でも、これが続くと思いますか？`, color: 'text-blue-600' }
    if (gap >= 3) return { emoji: '💡', text: `期待${record.expectationScore}点に対して実際${satisfactionScore}点。${gap}点のがっかりです。タバコは期待ほどよくないかもしれません。`, color: 'text-orange-600' }
    if (gap >= 1) return { emoji: '🤔', text: `期待${record.expectationScore}点に対して実際${satisfactionScore}点。わずかにがっかり。`, color: 'text-yellow-600' }
    return { emoji: '📊', text: `期待通りの満足感でした。記録が積み重なるとパターンが見えてきます。`, color: 'text-gray-600' }
  }

  if (saved) {
    const msg = gapMessage()
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-5 pb-20">
        <div className="text-center w-full max-w-sm">
          <div className="text-6xl mb-4">{msg.emoji}</div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">記録しました</h2>

          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 text-left">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">期待スコア</span>
              <span className="font-bold text-gray-700 text-lg">{record.expectationScore}点</span>
            </div>
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">実際の満足度</span>
              <span className="font-bold text-gray-700 text-lg">{satisfactionScore}点</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">差分</span>
              <span className={`font-bold text-lg ${gap > 0 ? 'text-orange-500' : gap < 0 ? 'text-blue-500' : 'text-gray-700'}`}>
                {gap > 0 ? `-${gap}` : gap < 0 ? `+${gapAbs}` : '±0'}点
              </span>
            </div>
          </div>

          <div className={`bg-orange-50 rounded-2xl p-4 mb-6 text-left ${gap >= 3 ? '' : 'bg-gray-50'}`}>
            <p className={`text-sm leading-relaxed ${msg.color}`}>{msg.text}</p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200 active:scale-95 transition-all"
          >
            ホームへ戻る
          </button>
        </div>
      </div>
    )
  }

  const msg = gapMessage()

  return (
    <div className="min-h-full">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-400 mb-3 flex items-center gap-1 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </button>
        <h1 className="text-xl font-bold text-gray-800">結果記録</h1>
        <p className="text-gray-400 text-xs mt-0.5">実際に吸ってみた満足度を記録しましょう</p>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* 吸う前の記録サマリー */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">吸う前の記録</p>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-gray-400">吸いたい強度</p>
              <p className="text-2xl font-bold text-gray-700">{record.cravingScore}<span className="text-sm font-normal text-gray-400">/10</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-400">期待スコア</p>
              <p className="text-2xl font-bold text-orange-500">{record.expectationScore}<span className="text-sm font-normal text-gray-400">/10</span></p>
            </div>
          </div>
        </div>

        <SliderInput
          label="実際の満足度"
          subLabel="実際に吸ってみて、どのくらいスッキリしましたか？"
          value={satisfactionScore}
          onChange={setSatisfactionScore}
          lowLabel="全然ダメだった"
          highLabel="期待通り"
          color="green"
        />

        {/* リアルタイムギャップ表示 */}
        <div className={`rounded-2xl p-4 ${gap >= 3 ? 'bg-orange-50' : gap <= -2 ? 'bg-blue-50' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{msg.emoji}</span>
            <p className="font-semibold text-gray-700 text-sm">
              期待 <span className="text-orange-500 font-bold">{record.expectationScore}点</span> →
              実際 <span className="text-green-600 font-bold">{satisfactionScore}点</span>
              {gap !== 0 && (
                <span className={`ml-1 ${gap > 0 ? 'text-orange-500' : 'text-blue-500'}`}>
                  （{gap > 0 ? `-${gap}` : `+${gapAbs}`}点）
                </span>
              )}
            </p>
          </div>
          <p className={`text-xs leading-relaxed ${msg.color}`}>{msg.text}</p>
        </div>

        <div className="space-y-2">
          <label className="font-semibold text-gray-800">
            メモ <span className="text-gray-400 font-normal text-sm">（任意）</span>
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="吸ってみた感想など"
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
