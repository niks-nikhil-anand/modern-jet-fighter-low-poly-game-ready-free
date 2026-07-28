import { useLayoutEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const MODEL_URL = '/models/jet-optimized.glb'

// Higher = snappier, lower = softer/floatier. Exponential decay keeps the
// easing feel consistent regardless of frame rate.
const EASE_SPEED = 10

export type JetModelHandle = {
  clipNames: string[]
}

type Props = {
  position: THREE.Vector3
  rotationY: number
  scale: number
  /** 0..1 — maps linearly across each clip's full duration (the "scrub" position). */
  progress: number
  onClipsReady?: (names: string[]) => void
}

export function JetModel({ position, rotationY, scale, progress, onClipsReady }: Props) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions, names } = useAnimations(animations, group)

  // Activate every clip once, then immediately pause it — this keeps each
  // action "live" in the mixer (so its pose is evaluated every frame) without
  // letting time auto-advance. From then on, only `progress` drives time.
  useLayoutEffect(() => {
    onClipsReady?.(names)
    names.forEach((name) => {
      const action = actions[name]
      if (!action) return
      action.reset().play()
      action.paused = true
      action.clampWhenFinished = true
      action.time = THREE.MathUtils.clamp(progress, 0, 1) * action.getClip().duration
    })
    return () => {
      names.forEach((name) => actions[name]?.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names])

  // Every progress (percent) change scrubs each clip to that exact stage.
  useLayoutEffect(() => {
    const clamped = THREE.MathUtils.clamp(progress, 0, 1)
    names.forEach((name) => {
      const action = actions[name]
      if (!action) return
      action.time = clamped * action.getClip().duration
    })
  }, [progress, names, actions])

  // Snap to the initial placement pose immediately (no easing on mount) —
  // easing only kicks in for gesture changes afterward.
  useLayoutEffect(() => {
    if (!group.current) return
    group.current.rotation.y = rotationY
    group.current.scale.setScalar(scale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ease scale/rotation toward their gesture-driven targets instead of
  // snapping instantly — gives pinch-zoom and drag-to-rotate a soft feel.
  useFrame((_, delta) => {
    if (!group.current) return
    const alpha = 1 - Math.exp(-EASE_SPEED * delta)
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, scale, alpha))
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      rotationY,
      alpha,
    )
  })

  return (
    <group ref={group} position={position}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
