import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'

interface DataTagProps {
  label: string
  value: string
  accent?: string
  offsetX?: number
  offsetY?: number
  delay?: number
}

export function DataTag({
  label,
  value,
  accent = '#ff3358',
  offsetX = 170,
  offsetY = 280,
  delay = 14,
}: DataTagProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const appear = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 20,
      mass: 0.9,
    },
  })

  const clamped = Math.max(0, Math.min(1, appear))

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: offsetX,
          bottom: offsetY,
          padding: '0.9rem 1.1rem',
          borderRadius: 16,
          border: '1px solid rgba(233,238,246,0.2)',
          background: 'rgba(5,7,12,0.75)',
          boxShadow: '0 18px 45px rgba(0,0,0,0.45)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(233,238,246,0.75)',
          transform: `translateY(${(1 - clamped) * 35}px)`,
          opacity: clamped,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 10 }}>{label}</span>
        <strong style={{ fontSize: 24, color: accent }}>{value}</strong>
      </div>
    </AbsoluteFill>
  )
}
