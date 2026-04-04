'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上にしてください')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center max-w-sm bg-white rounded-2xl shadow-sm p-8">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">確認メールを送信しました</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            <span className="font-medium text-gray-700">{email}</span> に確認メールを送りました。
            <br />
            メール内のリンクをクリックしてアカウントを有効化してください。
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-purple-600 font-semibold text-sm"
          >
            ログイン画面へ →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🚭</div>
          <h1 className="text-2xl font-bold text-gray-800">SmokeLog</h1>
          <p className="text-gray-500 text-sm mt-1">禁煙サポートアプリ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-5">新規登録</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                パスワード{' '}
                <span className="text-gray-400 font-normal">（8文字以上）</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                パスワード（確認）
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl disabled:opacity-60 active:scale-95 transition-all shadow-md shadow-purple-100"
            >
              {loading ? '登録中...' : 'アカウントを作成'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/auth/login" className="text-purple-600 font-semibold">
              ログイン
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          あなたのデータはセキュアに保護されています 🔒
        </p>
      </div>
    </div>
  )
}
