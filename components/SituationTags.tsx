'use client'

import { SITUATION_LABELS } from '@/lib/types'

interface SituationTagsProps {
  selected: string[]
  onChange: (tags: string[]) => void
}

export default function SituationTags({ selected, onChange }: SituationTagsProps) {
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((s) => s !== key))
    } else {
      onChange([...selected, key])
    }
  }

  return (
    <div className="space-y-2">
      <p className="font-semibold text-gray-800">状況タグ <span className="text-gray-400 font-normal text-sm">（任意）</span></p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(SITUATION_LABELS).map(([key, label]) => {
          const active = selected.includes(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                active
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
