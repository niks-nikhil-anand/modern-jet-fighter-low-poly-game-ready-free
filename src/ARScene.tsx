import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import {
  IfInSessionMode,
  useXRHitTest,
  useXRInputSourceEvent,
  useXRRequestHitTest,
  XRDomOverlay,
} from '@react-three/xr'
import { Reticle } from './Reticle'
import { JetModel } from './JetModel'
import { useGestureControls } from './useGestureControls'
import { useScrubControl } from './useScrubControl'

const matrixHelper = new THREE.Matrix4()
const FALLBACK_TIMEOUT_MS = 8000
const HIT_GRACE_PERIOD_MS = 1500
const HIT_TEST_TYPES: XRHitTestTrackableType[] = ['plane', 'point']

type Placement = {
  position: THREE.Vector3
  rotationY: number
}

export function ARScene() {
  const reticleRef = useRef<THREE.Mesh>(null)
  const reticleMatrix = useRef<THREE.Matrix4 | null>(null)
  const lastHitAt = useRef(0)
  const hitFoundRef = useRef(false)
  const placementRef = useRef<Placement | null>(null)
  const placingRef = useRef(false)
  const fallbackReadyRef = useRef(false)
  const [hitFound, setHitFound] = useState(false)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const camera = useThree((s) => s.camera)
  const requestHitTest = useXRRequestHitTest()
  const gestureLayerRef = useRef<HTMLDivElement | null>(null)
  const gestures = useGestureControls(!!placement, gestureLayerRef)
  const scrub = useScrubControl()

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (placementRef.current || results.length === 0) return
      if (!getWorldMatrix(matrixHelper, results[0])) return

      reticleMatrix.current = matrixHelper.clone()
      lastHitAt.current = Date.now()
      if (!hitFoundRef.current) {
        hitFoundRef.current = true
        setHitFound(true)
      }
      setShowFallback(false)
      if (reticleRef.current) {
        reticleRef.current.visible = true
        reticleRef.current.position.setFromMatrixPosition(matrixHelper)
      }
    },
    'viewer',
    HIT_TEST_TYPES,
  )

  useFrame(() => {
    if (placementRef.current) return

    const hitIsFresh = Date.now() - lastHitAt.current <= HIT_GRACE_PERIOD_MS
    if (hitFoundRef.current !== hitIsFresh) {
      hitFoundRef.current = hitIsFresh
      setHitFound(hitIsFresh)
    }
    if (reticleRef.current) reticleRef.current.visible = hitIsFresh
  })

  // The old fallback was only checked inside the hit-test callback. On a
  // device where a hit-test source cannot be created, that callback never
  // runs and the user is permanently stuck. A real timer works on those
  // tablet implementations too.
  useEffect(() => {
    if (placement) return
    fallbackReadyRef.current = false
    const timeout = window.setTimeout(() => {
      if (!placementRef.current && !reticleMatrix.current) {
        fallbackReadyRef.current = true
        setShowFallback(true)
      }
    }, FALLBACK_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [placement])

  const placeAtMatrix = useCallback((matrix: THREE.Matrix4) => {
    if (placementRef.current) return
    const position = new THREE.Vector3().setFromMatrixPosition(matrix)
    const camDir = new THREE.Vector3()
    camera.getWorldDirection(camDir)
    const rotationY = Math.atan2(-camDir.x, -camDir.z)
    const nextPlacement = { position, rotationY }
    placementRef.current = nextPlacement
    setPlacement(nextPlacement)
    setShowFallback(false)
    if (reticleRef.current) reticleRef.current.visible = false
  }, [camera])

  const placeFallback = useCallback(() => {
    if (placementRef.current) return
    const camDir = new THREE.Vector3()
    camera.getWorldDirection(camDir)
    camDir.y = 0
    camDir.normalize()
    const camPos = camera.position.clone()
    const position = camPos
      .add(camDir.multiplyScalar(2.2))
      .setY(camPos.y - 1.2)
    const rotationY = Math.atan2(-camDir.x, -camDir.z)
    const nextPlacement = { position, rotationY }
    placementRef.current = nextPlacement
    setPlacement(nextPlacement)
    setShowFallback(false)
  }, [camera])

  const place = useCallback(async () => {
    if (placementRef.current || placingRef.current) return
    placingRef.current = true
    try {
      // Query again at the moment of the tap. This avoids rejecting tablet
      // taps just because a continuous hit-test frame was briefly missed.
      const hit = await requestHitTest('viewer', HIT_TEST_TYPES)
      if (hit?.results.length && hit.getWorldMatrix(matrixHelper, hit.results[0])) {
        const matrix = matrixHelper.clone()
        reticleMatrix.current = matrix
        lastHitAt.current = Date.now()
        placeAtMatrix(matrix)
        return
      }

      // A recent continuous result is still a safe placement target.
      if (reticleMatrix.current && Date.now() - lastHitAt.current <= HIT_GRACE_PERIOD_MS) {
        placeAtMatrix(reticleMatrix.current)
      } else if (fallbackReadyRef.current) {
        // Also makes placement possible when DOM Overlay is unavailable and
        // the user can only trigger the native XR screen-select event.
        placeFallback()
      }
    } catch {
      // Continuous hit testing and the explicit fallback remain available.
    } finally {
      placingRef.current = false
    }
  }, [placeAtMatrix, placeFallback, requestHitTest])

  // Some tablet runtimes support WebXR hit testing but not DOM Overlay. In
  // that case the button is not visible, while the native screen select event
  // still fires. Supporting both paths keeps placement usable.
  useXRInputSourceEvent('all', 'select', () => void place(), [place])

  const reset = useCallback(() => {
    placementRef.current = null
    reticleMatrix.current = null
    lastHitAt.current = 0
    hitFoundRef.current = false
    fallbackReadyRef.current = false
    setPlacement(null)
    setHitFound(false)
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
          rotationX={gestures.pitchOffset}
          scale={gestures.scale}
          progress={scrub.progress}
        />
      )}

      <IfInSessionMode allow="immersive-ar">
        <XRDomOverlay>
          <div className="ar-overlay">
            {!placement && !showFallback && (
              <button className="place-btn" onClick={() => void place()}>
                {hitFound ? 'Tap to place jet' : 'Move device to scan, then tap…'}
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
                <div className="gizmo-clusters">
                  <div className="gizmo-cluster">
                    <span className="gizmo-label">Zoom</span>
                    <div className="gizmo-cluster-buttons">
                      <button
                        className="gizmo-btn"
                        onClick={gestures.zoomOut}
                        aria-label="Zoom out"
                      >
                        −
                      </button>
                      <button
                        className="gizmo-btn"
                        onClick={gestures.zoomIn}
                        aria-label="Zoom in"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="gizmo-cluster">
                    <span className="gizmo-label">Rotate</span>
                    <div className="gizmo-cluster-buttons">
                      <button
                        className="gizmo-btn"
                        onClick={gestures.rotateLeft}
                        aria-label="Rotate left"
                      >
                        ↺
                      </button>
                      <button
                        className="gizmo-btn"
                        onClick={gestures.rotateRight}
                        aria-label="Rotate right"
                      >
                        ↻
                      </button>
                    </div>
                  </div>

                  <div className="gizmo-cluster">
                    <span className="gizmo-label">Tilt</span>
                    <div className="gizmo-cluster-buttons">
                      <button
                        className="gizmo-btn"
                        onClick={gestures.tiltUp}
                        aria-label="Tilt up"
                      >
                        ↑
                      </button>
                      <button
                        className="gizmo-btn"
                        onClick={gestures.tiltDown}
                        aria-label="Tilt down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>

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
