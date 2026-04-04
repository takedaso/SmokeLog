'use client'

interface SliderInputProps {
  label: string
  subLabel?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  lowLabel?: string
  highLabel?: string
  color?: 'purple' | 'orange' | 'green'
}

const colorMap = {
  purple: {
    track: 'bg-purple-200',
    fill: 'bg-purple-500',
    badge: 'bg-purple-600 text-white',
  },
  orange: {
    track: 'bg-orange-200',
    fill: 'bg-orange-400',
    badge: 'bg-orange-500 text-white',
  },
  green: {
    track: 'bg-green-200',
    fill: 'bg-green-500',
    badge: 'bg-green-600 text-white',
  },
}

export default function SliderInput({
  label,
  subLabel,
  value,
  onChange,
  min = 1,
  max = 10,
  lowLabel = '低い',
  highLabel = '高い',
  color = 'purple',
}: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100
  const c = colorMap[color]

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-800">{label}</p>
          {subLabel && <p className="text-xs text-gray-500 mt-0.5">{subLabel}</p>}
        </div>
        <span className={`text-lg font-bold rounded-full w-10 h-10 flex items-center justify-center ${c.badge}`}>
          {value}
        </span>
      </div>

      <div className="relative">
        <div className={`h-1.5 rounded-full ${c.track}`}>
          <div
            className={`h-full rounded-full transition-all ${c.fill}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ margin: 0 }}
        />
        {/* visible thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-md border-2 border-white transition-all pointer-events-none ${c.fill}`}
          style={{ left: `calc(${pct}% - 12px)` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}
