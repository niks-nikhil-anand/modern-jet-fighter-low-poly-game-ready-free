import { useCallback, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useXRHitTest, XRDomOverlay, IfInSessionMode } from '@react-three/xr'
import { Reticle } from './Reticle'
import { JetModel } from './JetModel'
import { useGestureControls } from './useGestureControls'

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
  const [clips, setClips] = useState<string[]>([])
  const [sessionStart] = useState(() => Date.now())
  const [showFallback, setShowFallback] = useState(false)
  const camera = useThree((s) => s.camera)
  const gestures = useGestureControls(!!placement)

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
  }, [gestures])

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
          onClipsReady={setClips}
        />
      )}

      <IfInSessionMode allow="immersive-ar">
        <XRDomOverlay>
          <div className="ar-overlay">
            <div className="attribution">
              F-16 3D model by{' '}
              <a
                href="https://sketchfab.com/CreadorDeMu"
                target="_blank"
                rel="noreferrer"
              >
                CreadorDeMu
              </a>{' '}
              — CC BY 4.0
            </div>

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
              <div className="controls">
                {clips.length > 0 && (
                  <div className="clip-list">{clips.length} animation clip(s) playing</div>
                )}
                <div className="clip-list">
                  Pinch to zoom ({gestures.scale.toFixed(2)}x) · drag to rotate
                </div>

                <div className="gizmo-row">
                  <button className="gizmo-btn" onClick={gestures.rotateLeft} aria-label="Rotate left">
                    ⟲
                  </button>
                  <button className="gizmo-btn" onClick={gestures.zoomOut} aria-label="Zoom out">
                    −
                  </button>
                  <button className="gizmo-btn" onClick={gestures.zoomIn} aria-label="Zoom in">
                    +
                  </button>
                  <button className="gizmo-btn" onClick={gestures.rotateRight} aria-label="Rotate right">
                    ⟳
                  </button>
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
