'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SliderInput from '@/components/SliderInput'
import SituationTags from '@/components/SituationTags'
import { saveCraving, getSettings, updateCraving } from '@/lib/db'
import { CravingRecord, AppSettings } from '@/lib/types'

type Step = 'form' | 'choice' | 'done'

// 肺がんに関する実話・統計メッセージ（30秒ごとに切り替え）
const LUNG_CANCER_STORIES = [
  {
    emoji: '🫁',
    title: '末期肺がん患者の現実',
    body: '末期肺がんでは、安静にしているだけで息ができなくなります。24時間、酸素マスクを外せない日々。「もう一度、深呼吸がしたい」——それが最後の願いになります。',
  },
  {
    emoji: '📊',
    title: '喫煙者の肺がんリスク',
    body: '喫煙者は非喫煙者に比べ、肺がんになるリスクが男性で4.4倍。肺がんは日本人男性のがん死亡数第1位。今吸う1本が、20〜30年後の「その日」に近づけます。',
  },
  {
    emoji: '👨‍👩‍👧',
    title: 'ある50代男性の最期',
    body: '呼吸困難で入退院を繰り返す末期肺がんの男性。病室でも酸素チューブをずらしてタバコを吸おうとしていた。「やめたかった。でも体がもう言うことを聞かなかった」',
  },
  {
    emoji: '💔',
    title: 'お父さんの話',
    body: '「父は食事よりタバコを優先させ、何度入院しても吸い続けた。75歳で肺気腫で亡くなる前、一度だけ"悪かった"と言った。もっと早く気づいてほしかった」（日本禁煙学会 体験談より）',
  },
  {
    emoji: '⏳',
    title: 'タバコの煙の正体',
    body: 'タバコの煙には5,000種類を超える化学物質が含まれ、うち70種類以上が発がん性物質。今吸い込んでいるのは"空気"ではなく、じわじわと肺を壊す毒物の混合物です。',
  },
  {
    emoji: '🏥',
    title: '緩和ケア病棟の現実',
    body: '緩和ケア病棟では、毎日のように肺がん患者が「もっと早くやめていれば」と話す。痛みどめと酸素吸入が手放せない日々。その苦しみは、今この瞬間の選択で変えられます。',
  },
]

function CountdownTimer({ onResist, onSmoke }: { onResist: () => void; onSmoke: () => void }) {
  const TOTAL = 300 // 5分
  const [seconds, setSeconds] = useState(TOTAL)
  const [storyIndex, setStoryIndex] = useState(0)
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

  // 30秒ごとにストーリーを切り替え
  useEffect(() => {
    const elapsed = TOTAL - seconds
    const idx = Math.floor(elapsed / 30) % LUNG_CANCER_STORIES.length
    setStoryIndex(idx)
  }, [seconds])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const progress = ((TOTAL - seconds) / TOTAL) * 100
  const story = LUNG_CANCER_STORIES[storyIndex]

  if (survived) {
    return (
      <div className="flex-1 px-5 py-8 flex flex-col gap-4 items-center justify-center text-center">
        <div className="text-7xl mb-2">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800">5分、乗り越えました！</h2>
        <p className="text-gray-500 text-sm">クレービングのピークを越えました。<br />あなたは本当に強い。</p>
        <button
          onClick={onResist}
          className="mt-4 w-full bg-green-500 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-green-100 active:scale-95 transition-all"
        >
          我慢できた！ 💪
        </button>
        <button
          onClick={onSmoke}
          className="w-full bg-white border-2 border-orange-300 text-orange-600 font-semibold py-4 rounded-2xl text-base transition-all active:scale-95"
        >
          吸ってしまった…
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 px-5 py-6 flex flex-col gap-4">
      {/* カウントダウン */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-center text-white">
        <p className="text-white/80 text-sm mb-1">クレービングのピークまで</p>
        <p className="text-6xl font-bold tracking-tight tabular-nums">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </p>
        <p className="text-white/70 text-xs mt-2">深呼吸しながら待ってみましょう</p>
        {/* プログレスバー */}
        <div className="mt-4 bg-white/20 rounded-full h-1.5">
          <div
            className="bg-white rounded-full h-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 肺がんエピソード */}
      <div className="bg-gray-900 rounded-2xl p-5 text-white flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{story.emoji}</span>
          <p className="font-bold text-sm text-white/90">{story.title}</p>
          <span className="ml-auto text-xs text-white/40">{storyIndex + 1}/{LUNG_CANCER_STORIES.length}</span>
        </div>
        <p className="text-white/80 text-sm leading-relaxed">{story.body}</p>
        <div className="flex gap-1 mt-4 justify-center">
          {LUNG_CANCER_STORIES.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === storyIndex ? 'bg-purple-400 w-6' : 'bg-white/20 w-2'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ボタン */}
      <button
        onClick={onResist}
        className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-green-100 transition-all"
      >
        今すぐ我慢できた！ 💪
      </button>
      <button
        onClick={onSmoke}
        className="w-full bg-white border-2 border-orange-300 hover:bg-orange-50 active:scale-95 text-orange-600 font-semibold py-3 rounded-2xl text-sm transition-all"
      >
        吸ってしまった…
      </button>
      <p className="text-center text-gray-400 text-xs">タイマーを待たなくても選択できます</p>
    </div>
  )
}

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

      if (settings.phase === 'quitting') {
        await updateCraving(id, {
          result: { resisted: true, recordedAt: new Date().toISOString() },
        })
        setStep('choice')
      } else {
        setStep('choice')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleResist = async () => {
    if (!savedId) return
    await updateCraving(savedId, {
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
            記録が保存されました。
            <br />
            この積み重ねが禁煙成功につながります。
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
