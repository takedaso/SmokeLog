'use client'

import { useEffect, useState } from 'react'
import { getSettings, saveSettings, getCravings } from '@/lib/db'
import { exportToCSV } from '@/lib/storage'
import { AppSettings } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings>({ phase: 'preparation' })
  const [quitDateInput, setQuitDateInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [totalCravings, setTotalCravings] = useState(0)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email ?? '')

      const [s, c] = await Promise.all([getSettings(), getCravings()])
      setSettings(s)
      setTotalCravings(c.length)
      if (s.quitDate) setQuitDateInput(s.quitDate.slice(0, 10))
    }
    load()
  }, [])

  const handleSave = async () => {
    const updated: AppSettings = {
      phase: quitDateInput ? 'quitting' : 'preparation',
      quitDate: quitDateInput ? new Date(quitDateInput).toISOString() : undefined,
    }
    await saveSettings(updated)
    setSettings(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExportCSV = async () => {
    const cravings = await getCravings()
    const csv = exportToCSV(cravings)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smoke_record_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleResetData = async () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('cravings').delete().eq('user_id', user.id)
    await supabase.from('user_settings').delete().eq('user_id', user.id)

    setSettings({ phase: 'preparation' })
    setQuitDateInput('')
    setTotalCravings(0)
    setConfirmReset(false)
    alert('データをリセットしました')
  }

  return (
    <div className="min-h-full">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">設定</h1>
      </div>

      <div className="px-5 py-6 space-y-5">
        {/* アカウント */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-semibold text-gray-700 mb-3">アカウント</p>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
              {userEmail.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{userEmail}</p>
              <p className="text-xs text-gray-400">ログイン中</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl text-sm transition-all hover:bg-gray-50 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ログアウト
          </button>
        </div>

        {/* 現在のフェーズ */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-semibold text-gray-700 mb-3">現在のフェーズ</p>
          <div className={`flex items-center gap-3 p-4 rounded-xl ${settings.phase === 'quitting' ? 'bg-purple-50' : 'bg-indigo-50'}`}>
            <span className="text-2xl">{settings.phase === 'quitting' ? '🚭' : '📋'}</span>
            <div>
              <p className={`font-bold ${settings.phase === 'quitting' ? 'text-purple-700' : 'text-indigo-700'}`}>
                {settings.phase === 'quitting' ? '禁煙中' : '禁煙準備期'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {settings.phase === 'quitting'
                  ? `禁煙開始日: ${settings.quitDate ? new Date(settings.quitDate).toLocaleDateString('ja-JP') : '未設定'}`
                  : '禁煙開始日を設定するとフェーズBへ移行します'}
              </p>
            </div>
          </div>
        </div>

        {/* 禁煙開始日 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <p className="font-semibold text-gray-700 mb-1">禁煙開始日</p>
            <p className="text-xs text-gray-400">日付を設定すると「禁煙中」フェーズに切り替わります</p>
          </div>
          <input
            type="date"
            value={quitDateInput}
            onChange={(e) => setQuitDateInput(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
          />
          {quitDateInput && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-green-700 text-xs">
                {new Date(quitDateInput).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} から禁煙開始として記録されます
              </p>
            </div>
          )}
          <button
            onClick={handleSave}
            className={`w-full font-bold py-4 rounded-xl text-base transition-all active:scale-95 ${
              saved ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-100'
            }`}
          >
            {saved ? '保存しました ✓' : '設定を保存'}
          </button>
        </div>

        {/* データ管理 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <p className="font-semibold text-gray-700">データ管理</p>
          <p className="text-xs text-gray-400">総記録数: <span className="font-semibold text-gray-600">{totalCravings}件</span></p>
          <button
            onClick={handleExportCSV}
            disabled={totalCravings === 0}
            className="w-full flex items-center justify-center gap-2 border-2 border-purple-200 text-purple-600 font-semibold py-4 rounded-xl text-sm transition-all active:scale-95 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSVエクスポート
          </button>
          <button
            onClick={handleResetData}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${
              confirmReset ? 'bg-red-500 text-white' : 'text-red-400 border border-red-200 hover:bg-red-50'
            }`}
          >
            {confirmReset ? 'もう一度タップで全データを削除' : 'データをリセット'}
          </button>
          {confirmReset && (
            <button onClick={() => setConfirmReset(false)} className="w-full text-gray-400 text-xs py-1">
              キャンセル
            </button>
          )}
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 text-center">
          <p className="text-gray-500 text-xs leading-relaxed">
            SmokeLog v0.2.0<br />
            データはSupabase（PostgreSQL）に<br />セキュアに保存されています 🔒
          </p>
        </div>
      </div>
    </div>
  )
}
