import { forwardRef } from 'react'
import * as THREE from 'three'

export const Reticle = forwardRef<THREE.Mesh>((_, ref) => {
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.08, 0.1, 32]} />
      <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} />
    </mesh>
  )
})
Reticle.displayName = 'Reticle'
