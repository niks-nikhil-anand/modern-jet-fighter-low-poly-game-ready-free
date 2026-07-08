import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

const MODEL_URL = '/models/combat-jet-optimized.glb'

export type JetModelHandle = {
  clipNames: string[]
}

type Props = {
  position: THREE.Vector3
  rotationY: number
  scale: number
  onClipsReady?: (names: string[]) => void
}

export function JetModel({ position, rotationY, scale, onClipsReady }: Props) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    onClipsReady?.(names)
    names.forEach((name) => {
      const action = actions[name]
      action?.reset().fadeIn(0.3).play()
    })
    return () => {
      names.forEach((name) => actions[name]?.fadeOut(0.3))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names])

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
