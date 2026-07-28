import { useCallback, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useXRHitTest, XRDomOverlay, IfInSessionMode } from '@react-three/xr'
import { Reticle } from './Reticle'
import { JetModel } from './JetModel'
import { useGestureControls } from './useGestureControls'
import { useScrubControl } from './useScrubControl'

const matrixHelper = new THREE.Matrix4()
const FALLBACK_TIMEOUT_MS = 8000

type Placement = {
  position: THREE.Vector3
  rotationY: number
}

export function ARScene() {
  const reticleRef = useRef<THREE.Mesh>(null)
  const reticleMatrix = useRef<THREE.Matrix4 | null>(null)
  const [hitFound, setHitFound] = useState(false)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [sessionStart] = useState(() => Date.now())
  const [showFallback, setShowFallback] = useState(false)
  const camera = useThree((s) => s.camera)
  const gestureLayerRef = useRef<HTMLDivElement | null>(null)
  const gestures = useGestureControls(!!placement, gestureLayerRef)
  const scrub = useScrubControl()

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (results.length === 0) {
        setHitFound(false)
        if (reticleRef.current) reticleRef.current.visible = false
        if (!placement && Date.now() - sessionStart > FALLBACK_TIMEOUT_MS) {
          setShowFallback(true)
        }
        return
      }
      getWorldMatrix(matrixHelper, results[0])
      reticleMatrix.current = matrixHelper.clone()
      setHitFound(true)
      setShowFallback(false)
      if (reticleRef.current) {
        reticleRef.current.visible = !placement
        reticleRef.current.position.setFromMatrixPosition(matrixHelper)
      }
    },
    'viewer',
    'plane',
  )

  useFrame(() => {
    if (reticleRef.current && !placement) {
      reticleRef.current.visible = hitFound
    }
  })

  const place = useCallback(() => {
    if (placement) return
    if (!reticleMatrix.current) return
    const position = new THREE.Vector3().setFromMatrixPosition(reticleMatrix.current)
    const camDir = new THREE.Vector3()
    camera.getWorldDirection(camDir)
    const rotationY = Math.atan2(-camDir.x, -camDir.z)
    setPlacement({ position, rotationY })
    if (reticleRef.current) reticleRef.current.visible = false
  }, [placement, camera])

  const placeFallback = useCallback(() => {
    if (placement) return
    const camDir = new THREE.Vector3()
    camera.getWorldDirection(camDir)
    camDir.y = 0
    camDir.normalize()
    const camPos = camera.position.clone()
    const position = camPos
      .add(camDir.multiplyScalar(2.2))
      .setY(camPos.y - 1.2)
    const rotationY = Math.atan2(-camDir.x, -camDir.z)
    setPlacement({ position, rotationY })
    setShowFallback(false)
  }, [placement, camera])

  const reset = useCallback(() => {
    setPlacement(null)
    setShowFallback(false)
    gestures.reset()
    scrub.reset()
  }, [gestures, scrub])

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 2]} intensity={1.2} />

      <Reticle ref={reticleRef} />

      {placement && (
        <JetModel
          position={placement.position}
          rotationY={placement.rotationY + gestures.rotationOffset}
          scale={gestures.scale}
          progress={scrub.progress}
        />
      )}

      <IfInSessionMode allow="immersive-ar">
        <XRDomOverlay>
          <div className="ar-overlay">
            {!placement && !showFallback && (
              <button className="place-btn" onClick={place} disabled={!hitFound}>
                {hitFound ? 'Tap to place jet' : 'Move phone to scan the floor…'}
              </button>
            )}

            {!placement && showFallback && (
              <div className="fallback-panel">
                <p>Couldn't detect the floor. Place the jet 2m ahead instead?</p>
                <button className="place-btn" onClick={placeFallback}>
                  Place jet in front of me
                </button>
              </div>
            )}

            {placement && (
              <div
                className={`gesture-layer${gestures.gesturing ? ' gesture-layer-active' : ''}`}
                ref={gestureLayerRef}
              />
            )}

            {placement && (
              <div className="scrub-track">
                <span className="scrub-percent">{Math.round(scrub.progress * 100)}%</span>
                <input
                  type="range"
                  className="scrub-slider"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(scrub.progress * 100)}
                  onChange={(e) => scrub.setProgress(Number(e.target.value) / 100)}
                  aria-label="Scrub jet animation"
                />
              </div>
            )}

            {placement && (
              <div className="controls">
                <button className="reset-btn" onClick={reset}>
                  Reset placement
                </button>
              </div>
            )}
          </div>
        </XRDomOverlay>
      </IfInSessionMode>
    </>
  )
}
