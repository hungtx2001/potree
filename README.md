# Potree 2.0 (Modernized Point Cloud Engine & UI Suite)

[![npm version](https://img.shields.io/badge/version-2.0.0--alpha.1-blue.svg)](https://github.com/potree/potree)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%7C%206.x-blue)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r124+-green)](https://threejs.org/)
[![React 19](https://img.shields.io/badge/React-19.x-61dafb)](https://react.dev/)
[![License](https://img.shields.io/badge/license-BSD--2--Clause-blue.svg)](LICENSE)

**Potree 2.0** is an enterprise-grade, high-performance WebGL point cloud rendering engine for massive 3D LIDAR and photogrammetry datasets (billions of points). 

This modernized edition has undergone a **complete architectural overhaul**:
* 🚀 **Zero Global Namespace Pollution**: Pure ES Module (ESM) & CommonJS (CJS) with first-class TypeScript typings.
* 📦 **Decoupled 3-Tier Architecture**:
  * `potree` – Full-featured 3D viewer engine with camera controls, measurements, and cross-section profiles.
  * `potree/core` – 100% Headless zero-DOM 3D Octree streaming & LOD engine for custom Three.js, React Three Fiber, or WebGPU pipelines.
  * `potree/react` – Modern declarative React 19 UI suite with Glassmorphism, Ant Design styling, and vector SVG icons.
* ⚡ **Zero-jQuery Core**: All 3D math, measurements, slicing, and point-picking logic are pure Three.js and native DOM.
* 🔌 **Zero-Config Web Workers**: In-memory blob worker fallbacks to eliminate 404 missing worker errors in modern bundlers (Vite, Next.js, Webpack).
* 🌍 **Cesium 3D Geospatial Synchronization**: Built-in `CesiumControls` and React overlay for seamless terrain alignment.
* 🔄 **Replaces Legacy Git Clones**: Designed as a direct drop-in replacement for legacy git dependencies like `"PotreeConverter": "git+https://github.com/hungtx2001/PotreeConverter.git"`.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
  - [1. Declarative React 19 UI (`potree/react`)](#1-declarative-react-19-ui-potreereact)
  - [2. Full WebGL Viewer (`potree`)](#2-full-webgl-viewer-potree)
  - [3. Headless Zero-DOM Core Engine (`potree/core`)](#3-headless-zero-dom-core-engine-potreecore)
  - [4. Cesium Geospatial Integration](#4-cesium-geospatial-integration)
- [React 19 UI Components](#react-19-ui-components)
- [Supported Formats](#supported-formats)
- [Export Capabilities](#export-capabilities)
- [Development & Building](#development--building)
- [License & Credits](#license--credits)

---

## Installation

```bash
npm install potree three
```

If you are using the React 19 UI components:

```bash
npm install react react-dom
```

---

## Quick Start

### 1. Declarative React 19 UI (`potree/react`)

Build stunning, glassmorphic 3D GIS applications in React 19 with zero jQuery and full Ant Design aesthetics:

```tsx
import React, { useState } from 'react';
import { 
  PotreeViewer, 
  PotreeSidebar, 
  ProfileViewer, 
  FloatingToolbar 
} from 'potree/react';
import { usePotree } from 'potree/react';
import 'potree/css';

export const PointCloudApp: React.FC = () => {
  const { viewer, containerRef } = usePotree({
    pointBudget: 2_500_000,
    fov: 60,
    edlEnabled: true,
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  // Load dataset
  React.useEffect(() => {
    if (!viewer) return;
    viewer.loadPointCloud(
      'https://your-server.com/pointclouds/transmission_line/metadata.json',
      'Đường dây 500kV'
    ).then((res) => {
      viewer.fitToScreen();
    });
  }, [viewer]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Glassmorphic Sidebar Drawer */}
      <PotreeSidebar
        viewer={viewer}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenProfile={() => setProfileOpen(true)}
      />

      {/* Floating Action Toolbar */}
      <FloatingToolbar
        viewer={viewer}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* 3D Cross-Section Profile Viewer with Point Inspector */}
      <ProfileViewer
        viewer={viewer}
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
};
```

---

### 2. Full WebGL Viewer (`potree`)

For vanilla JavaScript or standard single-page applications:

```javascript
import { Viewer, loadPointCloud } from 'potree';
import 'potree/css';

const container = document.getElementById('potree_render_area');
const viewer = new Viewer(container);

viewer.setEDLEnabled(true);
viewer.setFOV(60);
viewer.setPointBudget(2_000_000);
viewer.setBackground('gradient'); // 'gradient' | 'black' | 'white' | 'skybox'

loadPointCloud('https://example.com/pointclouds/metadata.json').then((res) => {
  viewer.scene.addPointCloud(res.pointcloud);
  viewer.fitToScreen();
});
```

---

### 3. Headless Zero-DOM Core Engine (`potree/core`)

If you are developing a custom Three.js app, WebGPU engine, or React Three Fiber (R3F) application, import only the core streaming octree without any DOM or CSS baggage:

```javascript
import * as THREE from 'three';
import { loadPointCloud, updatePointClouds } from 'potree/core';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);

const pointclouds = [];

loadPointCloud('https://example.com/pointclouds/metadata.json').then((res) => {
  scene.add(res.pointcloud);
  pointclouds.push(res.pointcloud);
});

function animate() {
  requestAnimationFrame(animate);

  // Dynamic LOD streaming & node culling
  updatePointClouds(pointclouds, camera, renderer);

  renderer.render(scene, camera);
}
animate();
```

---

### 4. Cesium Geospatial Integration (`potree/cesium`)

Potree 2.0 features zero-jitter Cesium camera synchronization using UTM/EPSG projected coordinates:

```typescript
import { CesiumControls, CesiumPotreeOverlay } from 'potree/cesium';
import * as Cesium from 'cesium';

// In React:
<CesiumPotreeOverlay
  cesiumViewer={cesiumViewer}
  projection="+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs"
  pointCloudUrls={['https://your-server.com/pointclouds/metadata.json']}
/>
```

---

## React 19 UI Components

| Component | Description |
| :--- | :--- |
| **`<PotreeSidebar />`** | Comprehensive glassmorphic sidebar featuring Display Settings (EDL, Point Budget, FOV), Tools, Classification Filter, and Scene Hierarchy. |
| **`<ProfileViewer />`** | 2D/3D Cross-section profile viewer with line rotation, step advancement, export actions, and **Point Inspector Card** with 1-click coordinate copy. |
| **`<PointCloudPropertyPanel />`** | Real-time material controls for point size, shape (Square, Circle, Paraboloid), sizing type (Fixed, Adaptive), attribute coloring (RGB, Elevation, Intensity, Classification, GPS Time), and scientific gradients. |
| **`<SelectedObjectInspector />`** | Interactive property panel for measurements (length, area, angle, coordinates), volumes ($m^3$), and annotations. |
| **`<MeasurementPanel />`** | Measurement tools for Distance, Height, Angle, Area, and Volume. |
| **`<ClassificationFilterPanel />`** | Visual toggles and color scheme filters for ASPRS point classifications (Ground, Low/Med/High Veg, Buildings, Wires, Transmission Towers, Water). |
| **`<CesiumPotreeOverlay />`** | Overlay container synchronization between Cesium terrain and Potree 3D point cloud layers. |

---

## Supported Formats

Potree 2.0 automatically identifies and streams the following point cloud formats:
* **Potree 2.0 Octree** (`metadata.json`) – Multi-resolution chunked octree with zero-latency LOD.
* **Potree 1.x Legacy** (`cloud.js`) – Backward-compatible with older converted archives.
* **COPC** (`.copc.laz`) – Cloud Optimized Point Cloud directly from S3/HTTP range requests.
* **Entwine Point Tile (EPT)** (`ept.json`) – Multi-resolution entwine streaming.
* **LAS / LAZ** (`.las`, `.laz`) – Raw client-side binary parsing and streaming via WebAssembly / embedded worker decoders.

---

## Export Capabilities

Direct client-side, zero-jQuery data exporters:
* **DXF (AutoCAD 2D / 3D Profile)**: `viewer.profileWindow.exportDXF(is2D)`
* **GeoJSON (GIS Features)**: `GeoJSONExporter.toString(measurements)`
* **CSV (Spreadsheet Coordinates)**: `viewer.profileWindow.exportCSV()`
* **LAS (Extracted Point Cloud Subset)**: `viewer.profileWindow.exportLAS()`

---

## Development & Building

Clone the repository and install dependencies:

```bash
git clone https://github.com/hungtx2001/potree.git
cd potree
npm install
```

### Local Development Server

Run Vite with Hot Module Replacement (HMR):

```bash
npm run dev
```

### Type Checking

Validate TypeScript typings without emitting files:

```bash
npm run typecheck
```

### Production Build

Compile optimized production bundles with type definitions:

```bash
npm run build
```

Bundle outputs:
* `dist/potree.js` & `dist/potree.cjs`: Full viewer engine.
* `dist/core.js` & `dist/core.cjs`: Lightweight headless engine.
* `dist/react.js` & `dist/react.cjs`: Declarative React 19 UI suite.
* `dist/potree.css`: Scoped modern stylesheet.
* `dist/types/`: Complete TypeScript declaration files.

---

## License & Credits

* **Potree** was originally created by **Markus Schütz** at TU Wien ([Scanopy Project](https://www.cg.tuwien.ac.at/research/projects/Scanopy/)).
* Built on top of **Three.js** by [Mr.doob](https://github.com/mrdoob/three.js).
* Modernized by **Antigravity** & the **EVN/Open Source Community** under the **BSD-2-Clause License**.
