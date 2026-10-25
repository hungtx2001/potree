import './styles/theme.css';
import './styles/potree.css';

// Core engine (pure headless WebGL, Shaders, Octree, Loaders, Tools, Navigation)
export * from "./core/index.js";

// Viewer subsystem & UI
export * from "./viewer/index.js";

import "./core/utils/CameraExtensions.js";
import { runtime, workerPool, lru } from "./core/runtime/runtime.js";

export { workerPool, lru, runtime };

export const version = runtime.version;
export const debug = runtime.debug;

export let pointBudget = runtime.pointBudget;
export let framenumber = runtime.framenumber;
export let numNodesLoading = runtime.numNodesLoading;
export let maxNodesLoading = runtime.maxNodesLoading;

export const scriptPath = runtime.scriptPath;
export const resourcePath = runtime.resourcePath;
