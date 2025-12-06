import React, { useRef, Suspense, useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, CameraControls, ContactShadows, Html } from '@react-three/drei';

// ==========================================
// 1. ASSET LOADING & ERROR HANDLING
// ==========================================
const ActiveModel = ({ url, repeat = 1 }: { url: string; repeat?: number }) => {
  try {
    const { scene } = useGLTF(url);
    const frame = useCurrentFrame();
    
    // Clone the scene for each instance to avoid reference issues
    const clones = useMemo(() => {
        return Array.from({ length: repeat }).map(() => scene.clone());
    }, [scene, repeat]);

    return (
      <group>
        {clones.map((clone, i) => (
          <primitive 
            key={i}
            object={clone} 
            position={[i * -1.5, 0, 0]} 
            rotation={[0, frame * 0.005, 0]} 
            scale={1}
          />
        ))}
      </group>
    );
  } catch (e) {
    return (
        <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="red" />
            <Html position={[0, 1.5, 0]} center>
                <div style={{ color: 'red', background: 'black', padding: '8px', fontSize: '24px', fontWeight: 'bold' }}>
                    FAILED TO LOAD: {url}
                </div>
            </Html>
        </mesh>
    );
  }
};

// ==========================================
// 2. CAMERA ANIMATION SYSTEM
// ==========================================
const CameraRig = ({ action }: { action: string }) => {
  const controls = useRef<any>(null);
  const frame = useCurrentFrame();
  
  useFrame((state, delta) => {
    if (!controls.current) return;
    
    // Smooth camera movements based on action type
    if (action === 'orbit') {
      const azim = interpolate(frame, [0, 300], [0, 1.5]); 
      controls.current.rotateTo(azim, Math.PI / 3, true); 
    }
    else if (action === 'pan') {
      const truck = interpolate(frame % 300, [0, 300], [-2, 2]); 
      controls.current.truck(truck, 0, true);
    }
    else if (action === 'zoom_in') {
      const dolly = interpolate(frame % 300, [0, 300], [0, 2]);
      controls.current.dolly(dolly, true);
    }
    else {
       controls.current.rotateTo(0, Math.PI / 3, true);
    }

    controls.current.update(delta);
  });

  return <CameraControls ref={controls} smoothTime={0.8} />;
};

// ==========================================
// 3. UNIFIED OVERLAY SYSTEM (Lines & Gauges)
// ==========================================
const NeonOverlay = ({ config }: { config: any }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation Physics
  const grow = spring({
    frame: frame - config.startFrame,
    fps,
    config: { damping: 15, stiffness: 80 }
  });

  const opacity = interpolate(frame, [config.startFrame, config.startFrame + 10], [0, 1]);

  if (frame < config.startFrame) return null;

  // --- RENDER TYPE 1: MEASURE LINE (The Red/Green Lines) ---
  if (config.type === 'measure_line') {
    const height = interpolate(grow, [0, 1], [0, config.heightMultiplier * 100]);
    
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
         <div style={{ position: 'absolute', bottom: '20%', left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{
               height: `${height}px`, 
               width: '0px',
               borderLeft: `4px dashed ${config.color}`,
               boxShadow: `0 0 20px ${config.color}`,
               position: 'relative'
            }}>
               <div style={{
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%',
                  backgroundColor: config.color, 
                  position: 'absolute', 
                  top: 0, 
                  left: '-8px',
                  boxShadow: `0 0 10px ${config.color}, 0 0 20px white`
               }} />
            </div>
            <div style={{
               position: 'absolute', 
               top: `-${height + 40}px`, 
               left: '20px',
               color: 'white', 
               fontFamily: 'Inter, sans-serif', 
               fontWeight: 800, 
               fontSize: '32px',
               textShadow: '0 4px 10px black', 
               whiteSpace: 'nowrap'
            }}>
               <span style={{ color: config.color, fontSize: '48px' }}>{config.value}</span>
               <br/>
               <span style={{ fontSize: '24px', opacity: 0.8 }}>{config.label}</span>
            </div>
         </div>
      </AbsoluteFill>
    );
  }

  // --- RENDER TYPE 2: GAUGE / SPEEDOMETER (For pH Levels) ---
  if (config.type === 'gauge') {
    // Rotation: -90deg (Left) to +90deg (Right) based on value (0 to 14 pH logic approx)
    // Map value 0-10 to angle -90 to 90
    const targetAngle = interpolate(parseFloat(config.value), [0, 10], [-90, 90]);
    const currentAngle = interpolate(grow, [0, 1], [-90, targetAngle]);

    return (
      <AbsoluteFill style={{ 
        pointerEvents: 'none', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        opacity 
      }}>
        <div style={{ position: 'relative', width: '300px', height: '150px' }}>
          
          {/* Gauge Background (Rainbow Arch) */}
          <div style={{
            width: '300px', 
            height: '150px',
            background: `conic-gradient(from 270deg at 50% 100%, red 0deg, yellow 60deg, green 120deg, blue 180deg, transparent 180deg)`,
            borderTopLeftRadius: '150px', 
            borderTopRightRadius: '150px',
            opacity: 0.8,
            boxShadow: '0 0 30px rgba(255,255,255,0.2)'
          }} />

          {/* Black Center Cover to make it an arch */}
          <div style={{
            position: 'absolute', 
            bottom: 0, 
            left: '50%', 
            transform: 'translateX(-50%)',
            width: '200px', 
            height: '100px', 
            background: 'black',
            borderTopLeftRadius: '100px', 
            borderTopRightRadius: '100px'
          }} />

          {/* The Needle */}
          <div style={{
            position: 'absolute', 
            bottom: '0', 
            left: '50%',
            width: '4px', 
            height: '140px', 
            backgroundColor: 'white',
            transformOrigin: 'bottom center',
            transform: `translateX(-50%) rotate(${currentAngle}deg)`,
            boxShadow: '0 0 10px white',
            transition: 'transform 0.1s linear'
          }} />

          {/* Text */}
          <div style={{
            position: 'absolute', 
            bottom: '-80px', 
            width: '100%', 
            textAlign: 'center',
            color: 'white', 
            fontFamily: 'sans-serif', 
            fontSize: '40px', 
            fontWeight: 'bold'
          }}>
            {config.label}: <span style={{ color: config.color }}>{config.value}</span>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return null;
};

// ==========================================
// 4. MAIN COMPOSITION (BULLETPROOF STRUCTURE)
// ==========================================
export const UniversalComposition = ({ sceneConfig }: { sceneConfig: any }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // --- SCENE SELECTOR ---
  let currentFrameCount = 0;
  let activeScene = sceneConfig.scenes[0];
  
  if (sceneConfig && sceneConfig.scenes) {
    for (const scene of sceneConfig.scenes) {
        if (frame >= currentFrameCount && frame < currentFrameCount + scene.duration) {
            activeScene = scene;
            break;
        }
        currentFrameCount += scene.duration;
    }
  }

  if (!activeScene) {
      return (
        <AbsoluteFill style={{ backgroundColor: '#330000', justifyContent: 'center', alignItems: 'center' }}>
            <h1 style={{ color: 'white', fontFamily: 'monospace' }}>NO SCENE FOUND</h1>
        </AbsoluteFill>
      );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      
      {/* LAYER 1: 3D WORLD - BULLETPROOF FULL SCREEN CANVAS */}
      <AbsoluteFill>
        <Canvas 
            key={'canvas-' + width + 'x' + height}
            shadows 
            camera={{ position: [0, 2, 5], fov: 45 }}
            style={{ 
              width: '100%', 
              height: '100%',
              display: 'block',
              position: 'absolute',
              top: 0,
              left: 0
            }}
            dpr={1}
            gl={{ preserveDrawingBuffer: true, alpha: false, antialias: true }}
            resize={{ scroll: false, debounce: 0 }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.8} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <spotLight position={[-10, 5, -10]} intensity={5} color="#00ffff" /> 
          <pointLight position={[0, 5, 0]} intensity={1} />

          {/* Helpers */}
          <gridHelper args={[20, 20, 0xff0000, 0x444444]} />
          <axesHelper args={[2]} />

          {/* Content */}
          <Suspense fallback={null}>
            <ActiveModel url={activeScene.model} repeat={activeScene.repeatModel} />
            <Environment preset="city" />
          </Suspense>

          {/* Camera */}
          <CameraRig action={activeScene.camera.action} />
          <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
        </Canvas>
      </AbsoluteFill>

      {/* LAYER 2: 2D OVERLAYS */}
      <NeonOverlay config={activeScene.overlay} />
      
      {/* LAYER 3: DEBUG HUD */}
      <div style={{ 
          position: 'absolute', 
          top: 20, 
          left: 20, 
          color: '#0aff6a', 
          fontFamily: 'monospace', 
          fontSize: 14, 
          zIndex: 100,
          textShadow: '0 0 5px black'
      }}>
        [{width}x{height}] FRAME: {frame} | SCENE: {activeScene.id}
      </div>

    </AbsoluteFill>
  );
};
