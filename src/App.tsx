import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { createXRStore, XR } from '@react-three/xr'
import { ARScene } from './ARScene'
import './styles.css'

const store = createXRStore({
  hitTest: true,
  domOverlay: true,
  anchors: false,
})

type Support = 'checking' | 'supported' | 'unsupported'

export default function App() {
  const [support, setSupport] = useState<Support>('checking')
  const [started, setStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const nav = navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }
    if (!nav.xr) {
      setSupport('unsupported')
      return
    }
    nav.xr
      .isSessionSupported('immersive-ar')
      .then((ok) => setSupport(ok ? 'supported' : 'unsupported'))
      .catch(() => setSupport('unsupported'))
  }, [])

  const handleStart = async () => {
    setError(null)
    try {
      await store.enterAR()
      setStarted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start AR session')
    }
  }

  return (
    <div className="app-root">
      <Canvas>
        <XR store={store}>{started && <ARScene />}</XR>
      </Canvas>

      {!started && (
        <div className="intro-screen">
          <h1>F-16 Fighting Falcon — AR Viewer</h1>
          <p>Point your phone at an open floor area and tap Start AR.</p>

          {support === 'checking' && <p>Checking device support…</p>}

          {support === 'unsupported' && (
            <p className="warn">
              WebXR AR isn't supported on this browser. Use Chrome on Android.
            </p>
          )}

          {support === 'supported' && (
            <button className="start-btn" onClick={handleStart}>
              Start AR
            </button>
          )}

          {error && <p className="warn">{error}</p>}

          <p className="attribution-small">
            F-16 3D model by{' '}
            <a href="https://sketchfab.com/CreadorDeMu" target="_blank" rel="noreferrer">
              CreadorDeMu
            </a>{' '}
            — licensed CC BY 4.0
          </p>
        </div>
      )}
    </div>
  )
}
