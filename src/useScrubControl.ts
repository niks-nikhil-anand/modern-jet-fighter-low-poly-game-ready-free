import { useCallback, useState } from 'react'

/**
 * Holds the 0..1 scrub progress. Input is a native <input type="range">
 * (see ARScene.tsx) — native range inputs handle their own touch/pointer/
 * keyboard interaction at the OS/browser level, which is far more reliable
 * inside a WebXR dom-overlay than hand-rolled touch/pointer-capture logic.
 */
export function useScrubControl() {
  const [progress, setProgressState] = useState(0)

  const setProgress = useCallback((value: number) => {
    setProgressState(Math.min(1, Math.max(0, value)))
  }, [])

  const reset = useCallback(() => setProgressState(0), [])

  return { progress, setProgress, reset }
}
