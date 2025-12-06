import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraControls, useGLTF } from '@react-three/drei'
import type { CameraControls as CameraControlsImpl } from 'camera-controls'
import { Group, Mesh } from 'three'
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'

interface AnimatedModelProps {
  modelUrl?: string
  baseDistance?: number
  zoomDistance?: number
  hoverAmplitude?: number
  rotationCycles?: number
}

const DEFAULT_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'

export function AnimatedModel({
  modelUrl,
  baseDistance = 4.5,
  zoomDistance = 2.7,
  hoverAmplitude = 0.18,
  rotationCycles = 1.2,
}: AnimatedModelProps) {
  const groupRef = useRef<Group>(null)
  const controlsRef = useRef<CameraControlsImpl>(null)
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const source = modelUrl ?? DEFAULT_MODEL
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
    config: {
      damping: 16,
      mass: 1.1,
    },
    durationInFrames,
  })
  const rotationY = interpolate(spinSpring, [0, 1], [0, Math.PI * 2 * rotationCycles])
  const hover = Math.sin((frame / fps) * 2.4) * hoverAmplitude

  const cameraSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: {
      damping: 20,
      mass: 0.9,
    },
  })
  const cameraDistance = interpolate(cameraSpring, [0, 1], [baseDistance, zoomDistance])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationY
      groupRef.current.position.y = hover * 0.5
    }
    if (controlsRef.current) {
      controlsRef.current.setLookAt(0.1, 1.25 + hover, cameraDistance, 0, 1, 0, true)
    }
  })

  return (
    <>
      <group ref={groupRef} scale={1.05}>
        <primitive object={scene} />
      </group>
      <CameraControls
        ref={controlsRef}
        enabled={false}
        smoothTime={0.75}
        draggingSmoothTime={0.35}
        dollySpeed={0}
      />
    </>
  )
}

useGLTF.preload(DEFAULT_MODEL)
