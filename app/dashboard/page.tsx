'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { getCravings } from '@/lib/db'
import { CravingRecord, SITUATION_LABELS } from '@/lib/types'

function buildHourlyData(cravings: CravingRecord[]) {
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}時`, count: 0 }))
  cravings.forEach((c) => { hours[new Date(c.timestamp).getHours()].count++ })
  return hours
}

function buildExpectationData(cravings: CravingRecord[]) {
  return cravings
    .filter((c) => c.result && !c.result.resisted && c.result.satisfactionScore !== undefined)
    .slice(-20)
    .map((c, i) => ({
      name: `#${i + 1}`,
      期待: c.expectationScore,
      実際: c.result!.satisfactionScore,
      差: c.expectationScore - c.result!.satisfactionScore!,
    }))
}

function buildWeeklyData(cravings: CravingRecord[]) {
  const byWeek: Record<string, number[]> = {}
  cravings.forEach((c) => {
    const d = new Date(c.timestamp)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    if (!byWeek[key]) byWeek[key] = []
    byWeek[key].push(c.cravingScore)
  })
  return Object.entries(byWeek).map(([week, scores]) => ({
    week: `${week}週`,
    平均強度: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
    回数: scores.length,
  }))
}

function buildSituationData(cravings: CravingRecord[]) {
  const counts: Record<string, { count: number; totalCraving: number }> = {}
  cravings.forEach((c) => {
    c.situation.forEach((s) => {
      if (!counts[s]) counts[s] = { count: 0, totalCraving: 0 }
      counts[s].count++
      counts[s].totalCraving += c.cravingScore
    })
  })
  return Object.entries(counts)
    .map(([key, { count, totalCraving }]) => ({
      name: SITUATION_LABELS[key] || key,
      回数: count,
      平均強度: Number((totalCraving / count).toFixed(1)),
    }))
    .sort((a, b) => b.回数 - a.回数)
    .slice(0, 6)
}

type TabKey = 'hourly' | 'expectation' | 'weekly' | 'situation'

export default function DashboardPage() {
  const [cravings, setCravings] = useState<CravingRecord[]>([])
  const [tab, setTab] = useState<TabKey>('hourly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCravings().then(setCravings).finally(() => setLoading(false))
  }, [])

  const totalCravings = cravings.length
  const resistedCount = cravings.filter((c) => c.result?.resisted).length
  const resistRate = totalCravings > 0 ? Math.round((resistedCount / totalCravings) * 100) : 0

  const smokedWithResult = cravings.filter(
    (c) => c.result?.resisted === false && c.result.satisfactionScore !== undefined
  )
  const avgGap =
    smokedWithResult.length > 0
      ? (
          smokedWithResult.reduce(
            (s, c) => s + (c.expectationScore - c.result!.satisfactionScore!), 0
          ) / smokedWithResult.length
        ).toFixed(1)
      : null

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'hourly', label: '時間帯' },
    { key: 'expectation', label: '期待 vs 実際' },
    { key: 'weekly', label: '週次推移' },
    { key: 'situation', label: '状況別' },
  ]

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  if (totalCravings === 0) {
    return (
      <div className="min-h-full flex flex-col">
        <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">分析ダッシュボード</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-20 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">データがまだありません</h2>
          <p className="text-gray-400 text-sm">クレービングを記録すると<br />ここに分析が表示されます</p>
        </div>
      </div>
    )
  }

  const hourlyData = buildHourlyData(cravings)
  const expectationData = buildExpectationData(cravings)
  const weeklyData = buildWeeklyData(cravings)
  const situationData = buildSituationData(cravings)

  return (
    <div className="min-h-full">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">分析ダッシュボード</h1>
        <p className="text-gray-400 text-xs mt-0.5">全期間 {totalCravings}件の記録</p>
      </div>

      <div className="px-5 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">我慢成功率</p>
            <p className="text-3xl font-bold text-purple-600">{resistRate}<span className="text-sm font-normal text-gray-400">%</span></p>
            <p className="text-xs text-gray-400 mt-1">{resistedCount}回 / {totalCravings}回</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">平均がっかり度</p>
            {avgGap !== null ? (
              <>
                <p className="text-3xl font-bold text-orange-500">{avgGap}<span className="text-sm font-normal text-gray-400">点</span></p>
                <p className="text-xs text-gray-400 mt-1">期待 − 実際（{smokedWithResult.length}回）</p>
              </>
            ) : (
              <p className="text-lg font-semibold text-gray-300">データなし</p>
            )}
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === key ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          {tab === 'hourly' && (
            <>
              <p className="font-semibold text-gray-700 mb-1 text-sm">時間帯別クレービング頻度</p>
              <p className="text-xs text-gray-400 mb-4">どの時間帯に吸いたくなるか</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} formatter={(v) => [`${v}回`, '回数']} />
                  <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} name="回数" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {tab === 'expectation' && (
            <>
              <p className="font-semibold text-gray-700 mb-1 text-sm">期待 vs 実際の満足度</p>
              <p className="text-xs text-gray-400 mb-4">直近{expectationData.length}回の比較</p>
              {expectationData.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">吸った後の記録がまだありません</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={expectationData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[1, 10]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={5} stroke="#e5e7eb" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="期待" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="実際" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {expectationData.length > 0 && (
                <div className="mt-4 bg-orange-50 rounded-xl p-3">
                  <p className="text-xs text-orange-700 leading-relaxed">オレンジ（期待）が緑（実際）より常に上回っていれば、タバコは期待ほど良くないことを示しています。</p>
                </div>
              )}
            </>
          )}

          {tab === 'weekly' && (
            <>
              <p className="font-semibold text-gray-700 mb-1 text-sm">週次クレービング強度の推移</p>
              <p className="text-xs text-gray-400 mb-4">禁煙が進むと弱くなっていきます</p>
              {weeklyData.length < 2 ? (
                <div className="text-center py-10 text-gray-400 text-sm">2週間以上の記録が必要です</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weeklyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis domain={[1, 10]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="平均強度" stroke="#9333ea" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="回数" stroke="#e5e7eb" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 4" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}

          {tab === 'situation' && (
            <>
              <p className="font-semibold text-gray-700 mb-1 text-sm">状況タグ別分析</p>
              <p className="text-xs text-gray-400 mb-4">どの状況で吸いたくなるか</p>
              {situationData.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">状況タグの記録がまだありません</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={situationData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={55} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="回数" fill="#9333ea" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </div>

        {smokedWithResult.length >= 3 && Number(avgGap) >= 2 && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5">
            <p className="font-semibold text-purple-800 mb-2">💡 あなたへのインサイト</p>
            <p className="text-purple-700 text-sm leading-relaxed">
              あなたがタバコに期待する満足度は平均より <strong>{avgGap}点</strong> も高く設定されています。
              タバコは思ったほど良くないかもしれません。次回吸いたくなったとき、この事実を思い出してみてください。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
