'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCravings, getSettings } from '@/lib/db'
import { CravingRecord, AppSettings } from '@/lib/types'

function formatElapsed(from: Date): string {
  const diff = Date.now() - from.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}日 ${hours}時間 ${mins}分`
  if (hours > 0) return `${hours}時間 ${mins}分`
  return `${mins}分`
}

export default function HomePage() {
  const [settings, setSettings] = useState<AppSettings>({ phase: 'preparation' })
  const [cravings, setCravings] = useState<CravingRecord[]>([])
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, c] = await Promise.all([getSettings(), getCravings()])
        setSettings(s)
        setCravings(c)
      } finally {
        setLoading(false)
      }
    }
    load()
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const todayStr = now.toDateString()
  const todayCravings = cravings.filter(
    (c) => new Date(c.timestamp).toDateString() === todayStr
  )
  const avgCraving =
    todayCravings.length > 0
      ? (todayCravings.reduce((s, c) => s + c.cravingScore, 0) / todayCravings.length).toFixed(1)
      : '—'

  const todayResisted = todayCravings.filter((c) => c.result?.resisted === true).length
  const todaySmoked = todayCravings.filter((c) => c.result?.resisted === false).length

  const isQuitting = settings.phase === 'quitting'
  const quitDate = settings.quitDate ? new Date(settings.quitDate) : null

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🚭</div>
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div
        className={`px-5 pt-12 pb-8 ${
          isQuitting
            ? 'bg-gradient-to-br from-purple-600 to-purple-800'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white">
            {isQuitting ? '🚭 禁煙中' : '📋 禁煙準備中'}
          </span>
          <span className="text-white/70 text-sm">
            {now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
          </span>
        </div>

        {isQuitting && quitDate ? (
          <div className="text-center py-2">
            <p className="text-white/80 text-sm mb-1">禁煙してから</p>
            <p className="text-white text-4xl font-bold tracking-tight">{formatElapsed(quitDate)}</p>
            <p className="text-white/70 text-xs mt-2">経過しました</p>
          </div>
        ) : (
          <div className="py-2">
            <p className="text-white text-2xl font-bold">
              禁煙の準備を
              <br />
              しましょう
            </p>
            <p className="text-white/70 text-sm mt-1">記録を重ねて、タバコの実態を知ろう</p>
          </div>
        )}
      </div>

      <div className="px-5 -mt-4">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-800">{todayCravings.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">今日の記録</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-800">{avgCraving}</p>
            <p className="text-xs text-gray-500 mt-0.5">平均強度</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            {isQuitting ? (
              <>
                <p className="text-2xl font-bold text-purple-600">{todayResisted}</p>
                <p className="text-xs text-gray-500 mt-0.5">今日我慢</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-orange-500">{todaySmoked}</p>
                <p className="text-xs text-gray-500 mt-0.5">今日吸った</p>
              </>
            )}
          </div>
        </div>

        {/* Main CTA */}
        <Link
          href="/record"
          className="block w-full bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-center text-lg font-bold py-5 rounded-2xl shadow-lg shadow-purple-200 transition-all mb-4"
        >
          今すぐ記録する
        </Link>

        {/* Recent records */}
        {todayCravings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="font-semibold text-gray-700 text-sm">今日の記録</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[...todayCravings]
                .reverse()
                .slice(0, 5)
                .map((c) => {
                  const t = new Date(c.timestamp)
                  const timeStr = t.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const hasResult = c.result !== undefined
                  return (
                    <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="text-xs text-gray-400 w-10 shrink-0">{timeStr}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            強度 {c.cravingScore}
                          </span>
                          <span className="text-xs text-gray-400">期待 {c.expectationScore}</span>
                          {c.situation.length > 0 && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              {c.situation[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      {hasResult && (
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            c.result!.resisted
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {c.result!.resisted ? '我慢' : `吸${c.result!.satisfactionScore}点`}
                        </span>
                      )}
                      {!hasResult && c.phase === 'preparation' && (
                        <Link
                          href={`/result/${c.id}`}
                          className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full"
                        >
                          結果入力
                        </Link>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-indigo-50 rounded-2xl p-4 mb-6">
          <p className="text-indigo-800 text-sm font-semibold mb-1">💡 ヒント</p>
          <p className="text-indigo-700 text-xs leading-relaxed">
            {isQuitting
              ? 'クレービング（吸いたい気持ち）は通常3〜5分でピークを越えます。記録しながら乗り越えましょう。'
              : '「吸う前の期待」と「吸った後の満足度」を記録すると、タバコの実態が見えてきます。'}
          </p>
        </div>
      </div>
    </div>
  )
}
