import { RefObject, useEffect, useRef, useState } from 'react'

const MIN_SCALE = 0.2
const MAX_SCALE = 3
// Default view is 70% less zoomed in than "full size" (1x) — i.e. 30% scale.
const DEFAULT_SCALE = 0.3
const ROTATE_SPEED = 0.01
const ZOOM_STEP = 0.15
const ROTATE_STEP = Math.PI / 12 // 15 degrees

function touchDistance(a: Touch, b: Touch) {
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

/** Tiny haptic tick so a gesture starting feels acknowledged — soft, not buzzy. */
function softTick(ms = 8) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms)
    } catch {
      // ignore — vibration is a nice-to-have, never a hard requirement
    }
  }
}

/**
 * Pinch-to-zoom + one-finger drag-to-rotate.
 *
 * Important: `elementRef` must point at a DOM element that lives inside the
 * WebXR dom-overlay (e.g. a transparent layer rendered alongside the other
 * overlay UI), NOT the WebGL canvas. During an immersive-ar session the
 * browser generally does not dispatch normal touch/pointer events to the
 * canvas — only the designated dom-overlay root receives real DOM input.
 * Listening on the canvas is why gestures silently did nothing before.
 */
export function useGestureControls(active: boolean, elementRef: RefObject<HTMLElement | null>) {
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [rotationOffset, setRotationOffset] = useState(0)
  const [pitchOffset, setPitchOffset] = useState(0)
  const [gesturing, setGesturing] = useState(false)

  const scaleRef = useRef(DEFAULT_SCALE)
  const rotationRef = useRef(0)
  const pitchRef = useRef(0)
  const pinchStartDist = useRef<number | null>(null)
  const pinchStartScale = useRef(DEFAULT_SCALE)
  const dragStartX = useRef<number | null>(null)
  const dragStartRotation = useRef(0)

  useEffect(() => {
    if (!active) return
    const el = elementRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      setGesturing(true)
      if (e.touches.length === 2) {
        softTick()
        pinchStartDist.current = touchDistance(e.touches[0], e.touches[1])
        pinchStartScale.current = scaleRef.current
        dragStartX.current = null
      } else if (e.touches.length === 1) {
        softTick()
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
      if (e.touches.length < 1) {
        dragStartX.current = null
        setGesturing(false)
      }
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
  }, [active, elementRef])

  const reset = () => {
    scaleRef.current = DEFAULT_SCALE
    rotationRef.current = 0
    pitchRef.current = 0
    setScale(DEFAULT_SCALE)
    setRotationOffset(0)
    setPitchOffset(0)
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

  const tiltUp = () => {
    const next = pitchRef.current - ROTATE_STEP
    pitchRef.current = next
    setPitchOffset(next)
  }

  const tiltDown = () => {
    const next = pitchRef.current + ROTATE_STEP
    pitchRef.current = next
    setPitchOffset(next)
  }

  return {
    scale,
    rotationOffset,
    pitchOffset,
    gesturing,
    reset,
    zoomIn,
    zoomOut,
    rotateLeft,
    rotateRight,
    tiltUp,
    tiltDown,
  }
}
