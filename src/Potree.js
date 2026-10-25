import './styles/theme.css';
import './viewer/potree.css';

// Re-export entire core engine (pure headless WebGL, Shaders, Octree, Loaders, Tools, Navigation)
export * from "./core/index.js";

// Viewer subsystem & UI
export * from "./viewer/viewer.js";
export * from "./viewer/profile.js";
export * from "./viewer/map.js";
export * from "./viewer/store/PotreeStore.js";
export * from "./viewer/ui/components/ToggleGroup.js";
export * from "./viewer/ui/components/ModernSlider.js";
export * from "./viewer/ui/components/ModernColorPicker.js";
export * from "./viewer/ui/components/SceneTree.js";
export * from "./viewer/ui/FloatingToolbar.ts";
export * from "./viewer/ui/icons.js";

import "./core/utils/CameraExtensions.js";
import * as THREE from 'three';
import { Viewer } from "./viewer/viewer.js";
import { CesiumControls } from "./core/navigation/CesiumControls.ts";
import { PointSizeType, PointShape, CameraMode, ClipTask, ClipMethod } from "./core/types.ts";
import { runtime, workerPool, lru } from "./core/runtime/runtime.ts";
import { loadPointCloud } from "./core/index.js";

export { workerPool, lru, runtime };

export const version = runtime.version;
export const debug = runtime.debug;

export let pointBudget = runtime.pointBudget;
export let framenumber = runtime.framenumber;
export let numNodesLoading = runtime.numNodesLoading;
export let maxNodesLoading = runtime.maxNodesLoading;

export const scriptPath = runtime.scriptPath;
export const resourcePath = runtime.resourcePath;

// Dual-mode compatibility: auto-attach to window.Potree in browser environments
if (typeof window !== 'undefined') {
	const w = window;
	w.Potree = w.Potree || {};
	try {
		Object.defineProperty(w.Potree, 'Viewer', {
			get() { return Viewer; },
			configurable: true,
			enumerable: true
		});
	} catch (_) {
		w.Potree.Viewer = Viewer;
	}
	w.Potree.loadPointCloud = loadPointCloud;
	w.Potree.CesiumControls = CesiumControls;
	w.Potree.PointSizeType = PointSizeType;
	w.Potree.PointShape = PointShape;
	w.Potree.CameraMode = CameraMode;
	w.Potree.ClipTask = ClipTask;
	w.Potree.ClipMethod = ClipMethod;
	w.Potree.runtime = runtime;
	w.Potree.workerPool = workerPool;
	w.Potree.lru = lru;
	w.Potree.version = version;
	w.Potree.scriptPath = scriptPath;
	w.Potree.resourcePath = resourcePath;
	if (!w.THREE) {
		w.THREE = THREE;
	}
}
