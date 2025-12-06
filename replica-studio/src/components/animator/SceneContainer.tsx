import { Suspense, type ReactNode, useMemo, useRef } from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import { useFrame } from '@react-three/fiber'
import {
  AccumulativeShadows,
  CameraControls,
  ContactShadows,
  Environment,
  Float,
  Text,
  useGLTF,
} from '@react-three/drei'
import type { CameraControls as CameraControlsImpl } from 'camera-controls'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Color, Group, Mesh } from 'three'
import type { CameraPathPreset } from '@/types/schema'
import { MODEL_ASSET_MAP, resolveModelAsset } from '@/services/asset-map'

interface SceneContainerProps {
  modelQuery?: string
  fallbackModelUrl?: string
  cameraPath?: CameraPathPreset
  backgroundColor?: string
  children?: ReactNode
}

const DefaultSpecimen = () => (
  <Float floatIntensity={1.2} rotationIntensity={0.35} speed={0.6}>
    <mesh castShadow receiveShadow>
      <icosahedronGeometry args={[0.9, 1]} />
      <meshStandardMaterial
        color="#9ad0ff"
        roughness={0.25}
        metalness={0.35}
        emissive="#1f3bff"
        emissiveIntensity={0.25}
      />
    </mesh>
    <mesh position={[0.35, -0.25, 0.25]} castShadow>
      <torusKnotGeometry args={[0.25, 0.08, 80, 12]} />
      <meshStandardMaterial
        color="#ff5898"
        roughness={0.15}
        metalness={0.55}
        emissive="#ff3358"
        emissiveIntensity={0.35}
      />
    </mesh>
  </Float>
)

const defaultAsset = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'

const CAMERA_BEHAVIORS: Record<CameraPathPreset, { base: number; zoom: number; pan?: number }> = {
  orbit: { base: 4.5, zoom: 2.8 },
  pan_horizontal: { base: 5, zoom: 3.4, pan: 1.1 },
  zoom_in: { base: 4, zoom: 2.2 },
}

const DynamicModelLoader = ({
  modelQuery,
  fallbackModelUrl,
  cameraPath = 'orbit',
}: {
  modelQuery?: string
  fallbackModelUrl?: string
  cameraPath?: CameraPathPreset
}) => {
  const controlsRef = useRef<CameraControlsImpl>(null)
  const groupRef = useRef<Group>(null)
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const assetPath = resolveModelAsset(modelQuery)

  if (!assetPath && !fallbackModelUrl) {
    return <MissingModel name={modelQuery ?? 'unknown'} />
  }

  const source = assetPath ?? fallbackModelUrl ?? defaultAsset

  const { scene } = useGLTF(source)

  useMemo(() => {
    scene.traverse((node) => {
      const mesh = node as Mesh & { isMesh?: boolean }
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
  }, [scene])

  const spinSpring = spring({
    frame,
    fps,
    config: { damping: 16, mass: 1 },
    durationInFrames,
  })
  const hover = Math.sin((frame / fps) * 2.2) * 0.18
  const rotationY = interpolate(spinSpring, [0, 1], [0, Math.PI * 2])

  const cameraSpring = spring({
    frame,
    fps,
    config: { damping: 18, mass: 0.85 },
  })
  const behavior = CAMERA_BEHAVIORS[cameraPath] ?? CAMERA_BEHAVIORS.orbit
  const cameraDistance = interpolate(cameraSpring, [0, 1], [behavior.base, behavior.zoom])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationY
      groupRef.current.position.y = hover * 0.4
    }
    if (controlsRef.current) {
      const panOffset = behavior.pan ? Math.sin(frame / fps) * behavior.pan : 0
      controlsRef.current.setLookAt(panOffset, 1.2 + hover, cameraDistance, 0, 1, 0, true)
    }
  })

  return (
    <>
      <group ref={groupRef} scale={1.05}>
        <primitive object={scene} />
      </group>
      <CameraControls ref={controlsRef} enabled={false} smoothTime={0.8} dollySpeed={0} />
    </>
  )
}

const MissingModel = ({ name }: { name: string }) => (
  <Float floatIntensity={1} rotationIntensity={0.4} speed={0.8}>
    <mesh castShadow>
      <boxGeometry args={[1.8, 1, 1]} />
      <meshStandardMaterial color="#ff3358" emissive="#ff2266" emissiveIntensity={0.35} />
    </mesh>
    <Text
      fontSize={0.28}
      color="#ffffff"
      position={[0, 0.8, 0]}
      anchorX="center"
      anchorY="middle"
      maxWidth={2}
    >
      {`Missing Model: ${name}`}
    </Text>
  </Float>
)

Object.values(MODEL_ASSET_MAP).forEach((assetPath) => {
  useGLTF.preload(assetPath)
})
useGLTF.preload(defaultAsset)

export default function SceneContainer({
  modelQuery,
  fallbackModelUrl,
  cameraPath = 'orbit',
  backgroundColor = '#05070b',
  children,
}: SceneContainerProps) {
  const { width, height } = useVideoConfig()

  return (
    <AbsoluteFill>
      <ThreeCanvas
        shadows
        dpr={[1, 1.5]}
        width={width}
        height={height}
        camera={{ position: [2.8, 1.7, 3.6], fov: 42 }}
        onCreated={({ scene }) => {
          scene.background = new Color(backgroundColor)
        }}
      >
        <color attach="background" args={[0.02, 0.02, 0.05]} />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[4, 5, 2]}
          intensity={1.6}
          color="#fff3df"
          castShadow
        />
        <directionalLight
          position={[-3, 2, -2]}
          intensity={0.7}
          color="#88c2ff"
        />
        <directionalLight
          position={[0, 4.5, -4]}
          intensity={0.9}
          color="#19d5ff"
        />

        <Suspense fallback={<DefaultSpecimen />}>
          {children ? (
            children
          ) : (
            <DynamicModelLoader modelQuery={modelQuery} fallbackModelUrl={fallbackModelUrl} cameraPath={cameraPath} />
          )}
        </Suspense>

        <Environment preset="city" />
        <ContactShadows
          position={[0, -1, 0]}
          opacity={0.35}
          scale={12}
          blur={2.5}
          far={8}
        />
        <AccumulativeShadows
          temporal
          frames={50}
          color={new Color('#1d293f')}
          colorBlend={0.5}
          opacity={0.6}
          alphaTest={0.6}
          scale={12}
          position={[0, -1.05, 0]}
        >
          <directionalLight position={[5, 5, -2]} intensity={0.4} color="#0affb5" />
        </AccumulativeShadows>

        <EffectComposer disableNormalPass>
          <Bloom mipmapBlur luminanceThreshold={0.2} luminanceSmoothing={0.25} intensity={0.9} />
          <Vignette eskil={false} offset={0.2} darkness={0.65} />
        </EffectComposer>
      </ThreeCanvas>
    </AbsoluteFill>
  )
}

