import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'

interface NeonLineProps {
  height: number
  accent?: string
  delay?: number
  offsetX?: number
  offsetY?: number
  thickness?: number
}

export function NeonLine({
  height,
  accent = '#0affb5',
  delay = 8,
  offsetX = 92,
  offsetY = 80,
  thickness = 4,
}: NeonLineProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const grow = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 18,
      mass: 0.8,
    },
  })

  const animatedHeight = Math.max(0, Math.min(1, grow)) * height

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: offsetX,
          bottom: offsetY,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <svg
          width={60}
          height={height + 40}
          style={{
            overflow: 'visible',
            filter: `drop-shadow(0 0 16px ${accent}) drop-shadow(0 0 36px ${accent}40)` as const,
          }}
        >
          <defs>
            <linearGradient id="neon-stroke" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
              <stop offset="65%" stopColor={accent} stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <line
            x1={30}
            y1={height}
            x2={30}
            y2={height - animatedHeight}
            stroke="url(#neon-stroke)"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray="10 6"
          />
          <circle cx={30} cy={height} r={6} fill={accent} opacity={0.9} />
          <circle cx={30} cy={height - animatedHeight} r={5} fill={accent} opacity={0.85} />
        </svg>
      </div>
    </AbsoluteFill>
  )
}
