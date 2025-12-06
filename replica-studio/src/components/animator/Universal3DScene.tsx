import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { UniversalSceneConfig, EnvironmentPreset } from '@/types/schema'
import SceneContainer from './SceneContainer'
import { NeonLine } from './NeonLine'
import { DataTag } from './DataTag'

interface Universal3DSceneProps {
  config: UniversalSceneConfig
}

const ENVIRONMENT_PRESETS: Record<EnvironmentPreset, { background: string; accent: string }> = {
  studio: { background: '#05070b', accent: '#0aff6a' },
  space: { background: '#030219', accent: '#0af4ff' },
  outdoor: { background: '#041408', accent: '#ffb347' },
}

const OVERLAY_OFFSET_Y = 70

export const Universal3DScene: React.FC<Universal3DSceneProps> = ({ config }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const env = ENVIRONMENT_PRESETS[config.environment] ?? ENVIRONMENT_PRESETS.studio

  const renderOverlay = (overlay: UniversalSceneConfig['overlays'][number], index: number) => {
    const frameOffset = frame - overlay.triggerFrame
    if (frameOffset < 0) {
      return null
    }
    const appear = spring({
      frame: frameOffset,
      fps,
      config: { damping: 18, mass: 0.9 },
    })
    const translateY = interpolate(appear, [0, 1], [20, 0])
    const opacity = AppearClamped(appear)

    switch (overlay.type) {
      case 'neon_line':
        return (
          <AbsoluteFill key={`${config.id}-line-${index}`} style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
            <div style={{ position: 'relative', left: 120, top: OVERLAY_OFFSET_Y + index * 180, opacity }}>
              <NeonLine height={Number(overlay.data?.height ?? 220)} accent={env.accent} />
              <DataTag
                label={(overlay.data?.label as string) ?? 'Metric'}
                value={(overlay.data?.value as string) ?? ''}
                accent={env.accent}
                offsetY={Number(overlay.data?.height ?? 220) + 110}
              />
            </div>
          </AbsoluteFill>
        )
      case 'floating_text': {
        const label = (overlay.data?.label as string) ?? 'Note'
        const value = (overlay.data?.value as string) ?? (overlay.data?.text as string) ?? ''
        return (
          <div
            key={`${config.id}-text-${index}`}
            style={{
              position: 'absolute',
              top: 80 + index * 110,
              right: 80,
              padding: '1rem 1.5rem',
              borderRadius: 18,
              border: '1px solid rgba(233,238,246,0.35)',
              background: 'rgba(5,7,12,0.65)',
              transform: `translateY(${translateY}px)`,
              opacity,
              backdropFilter: 'blur(12px)',
              maxWidth: 260,
              color: '#e9eef6',
            }}
          >
            <p style={{ margin: 0, letterSpacing: '0.2em', fontSize: 12, textTransform: 'uppercase', opacity: 0.7 }}>{label}</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: 20 }}>{value}</p>
          </div>
        )
      }
      case 'gauge': {
        const label = (overlay.data?.label as string) ?? 'Gauge'
        const value = (overlay.data?.value as string) ?? ''
        return (
          <div
            key={`${config.id}-gauge-${index}`}
            style={{
              position: 'absolute',
              bottom: 80 + index * 90,
              right: 90,
              width: 220,
              borderRadius: 18,
              padding: '1rem',
              border: '1px solid rgba(233,238,246,0.25)',
              background: 'rgba(5,7,12,0.7)',
              transform: `translateY(${translateY}px)`,
              opacity,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7 }}>{label}</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: 24 }}>{value}</p>
            <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: 'rgba(233,238,246,0.2)' }}>
              <div
                style={{
                  width: `${Math.min(100, Number(overlay.data?.percent ?? 80))}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: env.accent,
                }}
              />
            </div>
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <AbsoluteFill style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#e9eef6' }}>
      <SceneContainer
        modelQuery={config.modelQuery}
        cameraPath={config.cameraPath}
        backgroundColor={env.background}
      />
      {config.overlays.map((overlay, overlayIndex) => renderOverlay(overlay, overlayIndex))}
    </AbsoluteFill>
  )
}

function AppearClamped(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}
