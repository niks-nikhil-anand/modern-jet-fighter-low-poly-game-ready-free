import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'

const MIN_SCALE = 0.2
const MAX_SCALE = 3
const ROTATE_SPEED = 0.01
const ZOOM_STEP = 0.15
const ROTATE_STEP = Math.PI / 12 // 15 degrees

function touchDistance(a: Touch, b: Touch) {
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

export function useGestureControls(active: boolean) {
  const gl = useThree((s) => s.gl)
  const [scale, setScale] = useState(1)
  const [rotationOffset, setRotationOffset] = useState(0)

  const scaleRef = useRef(1)
  const rotationRef = useRef(0)
  const pinchStartDist = useRef<number | null>(null)
  const pinchStartScale = useRef(1)
  const dragStartX = useRef<number | null>(null)
  const dragStartRotation = useRef(0)

  useEffect(() => {
    if (!active) return
    const el = gl.domElement

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist.current = touchDistance(e.touches[0], e.touches[1])
        pinchStartScale.current = scaleRef.current
        dragStartX.current = null
      } else if (e.touches.length === 1) {
        dragStartX.current = e.touches[0].clientX
        dragStartRotation.current = rotationRef.current
        pinchStartDist.current = null
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        e.preventDefault()
        const dist = touchDistance(e.touches[0], e.touches[1])
        const ratio = dist / pinchStartDist.current
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale.current * ratio))
        scaleRef.current = next
        setScale(next)
      } else if (e.touches.length === 1 && dragStartX.current !== null) {
        e.preventDefault()
        const dx = e.touches[0].clientX - dragStartX.current
        const next = dragStartRotation.current + dx * ROTATE_SPEED
        rotationRef.current = next
        setRotationOffset(next)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDist.current = null
      if (e.touches.length < 1) dragStartX.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('touchcancel', onTouchEnd, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [active, gl])

  const reset = () => {
    scaleRef.current = 1
    rotationRef.current = 0
    setScale(1)
    setRotationOffset(0)
  }

  const zoomIn = () => {
    const next = Math.min(MAX_SCALE, scaleRef.current + ZOOM_STEP)
    scaleRef.current = next
    setScale(next)
  }

  const zoomOut = () => {
    const next = Math.max(MIN_SCALE, scaleRef.current - ZOOM_STEP)
    scaleRef.current = next
    setScale(next)
  }

  const rotateLeft = () => {
    const next = rotationRef.current - ROTATE_STEP
    rotationRef.current = next
    setRotationOffset(next)
  }

  const rotateRight = () => {
    const next = rotationRef.current + ROTATE_STEP
    rotationRef.current = next
    setRotationOffset(next)
  }

  return { scale, rotationOffset, reset, zoomIn, zoomOut, rotateLeft, rotateRight }
}
