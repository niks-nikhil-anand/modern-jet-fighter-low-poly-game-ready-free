# Combat Jet AR Viewer ✈️✨

A high-performance, interactive WebXR Augmented Reality application that lets users project a low-poly combat jet model into their physical space. Built with React, Three.js, React Three Fiber (R3F), and WebXR (via `@react-three/xr`).

This application allows users to position a virtual 3D combat jet, scale and rotate it with native-feeling touch gestures, and scrub through its built-in animations using an on-screen slider.

---

## 🚀 Key Features

- **WebXR Immersive AR:** Seamless entry into immersive augmented reality using the latest WebXR Device APIs.
- **Real-time Hit Testing:** Scans the real-world environment to detect flat surfaces (floors/tables) and projects a placement reticle.
- **Smart Fallback Placement:** If the device struggles to detect surface planes after 8 seconds, the app offers an option to spawn the jet 2.2 meters directly in front of the viewer.
- **Fluid Gesture Controls:**
  - **Pinch-to-Zoom:** Scale the model between `0.2x` and `3.0x` of its original size.
  - **Drag-to-Rotate:** Spin the jet along its Y-axis using horizontal drags.
  - **Buttery-Smooth Easing:** Interactive adjustments (scale/rotation) use exponential decay interpolation for a premium, non-jittery experience.
- **Animation Scrubbing Timeline:** A slider in the DOM overlay lets users scrub through the 3D model's action states from `0%` to `100%`.
- **Haptic Feedback:** Soft vibration ticks acknowledge the start of zoom and rotation gestures on supported mobile devices.

---

## 🛠️ Tech Stack

- **Framework:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool / Bundler:** [Vite 5](https://vitejs.dev/)
- **3D Engine:** [Three.js](https://threejs.org/) + [React Three Fiber (R3F)](https://r3f.docs.pmnd.rs/)
- **WebXR Integration:** `@react-three/xr`
- **Helpers & Loaders:** `@react-three/drei` (for GLTF loading, animations, and camera management)
- **Local Dev Security:** `vite-plugin-mkcert` (provides local HTTPS certificates required to test WebXR on mobile browsers)

---

## 📂 Project Structure

```
├── public/
│   └── models/
│       └── jet-optimized.glb    # Optimized 3D model file
├── src/
│   ├── main.tsx                 # Application entry point
│   ├── App.tsx                  # WebXR capabilities check & app canvas wrapper
│   ├── ARScene.tsx              # Main AR logic, hit-testing, placement, and UI overlays
│   ├── JetModel.tsx             # 3D Jet loader, R3F animation mixer, and easing loops
│   ├── Reticle.tsx              # Circular ring indicating floor alignment
│   ├── useGestureControls.ts    # Custom hook handling touch events for rotate & scale
│   ├── useScrubControl.ts       # Hook for managing timeline scrub state
│   └── styles.css               # Premium dark mode UI and glassmorphism styling
├── index.html                   # HTML base template
├── vite.config.ts               # Vite configuration (with mkcert support)
└── tsconfig.json                # TypeScript compiler configuration
```

---

## ⚙️ Getting Started & Installation

### Prerequisites

- **Node.js** (v18+ recommended)
- **A WebXR-supported device:** Typically Google Chrome on Android with Google Play Services for AR installed.

### Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/nikhil-reds/Combat-Jet-AR-Viewer.git
   cd Combat-Jet-AR-Viewer
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Development Server:**
   WebXR requires a secure context (HTTPS) to function. The project is configured with `vite-plugin-mkcert` to automatically spin up a local HTTPS server.
   ```bash
   npm run dev
   ```

4. **Accessing the App:**
   - **Local host:** Open `https://localhost:5173` in your browser.
   - **On Mobile:** Connect your computer and phone to the same local Wi-Fi network. Find your computer's local IP address (e.g., `192.168.x.x`) and navigate to `https://<YOUR_COMPUTER_IP>:5173` on your mobile device. *(Accept the self-signed certificate warning if prompted).*

---

## 🎨 Attribution & Licenses

- **Combat Jet 3D Model:** `"Combat Jet Animation"` by [3DHaupt](https://sketchfab.com/dennish2010), licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) (Non-Commercial use only).
