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
import { runtime, workerPool, lru } from "./core/runtime/runtime.ts";

export { workerPool, lru, runtime };

export const version = runtime.version;
export const debug = runtime.debug;

export let pointBudget = runtime.pointBudget;
export let framenumber = runtime.framenumber;
export let numNodesLoading = runtime.numNodesLoading;
export let maxNodesLoading = runtime.maxNodesLoading;

export const scriptPath = runtime.scriptPath;
export const resourcePath = runtime.resourcePath;
