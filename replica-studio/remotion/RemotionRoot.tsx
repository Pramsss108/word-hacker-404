import { Composition } from 'remotion'
import { UniversalComposition } from '@/remotion/UniversalComposition'
import type { UniversalSceneConfig } from '@/types/schema'

const FPS = 30
const DEFAULT_SCENE: UniversalSceneConfig = {
  id: 'demo-human',
  durationInFrames: 360,
  modelQuery: 'human_intestine',
  environment: 'studio',
  cameraPath: 'orbit',
  overlays: [
    { type: 'floating_text', triggerFrame: 60, data: { label: 'Status', value: 'Ready' } },
    { type: 'neon_line', triggerFrame: 140, data: { label: 'Energy', value: '72%', height: 160 } },
  ],
}

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="universal-sequence"
      component={UniversalComposition}
      durationInFrames={DEFAULT_SCENE.durationInFrames}
      fps={FPS}
      width={1280}
      height={720}
      defaultProps={{ scenes: [DEFAULT_SCENE] }}
    />
  </>
)
