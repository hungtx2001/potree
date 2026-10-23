import { WorkerPool } from './WorkerPool.js';
import { LRU } from './LRU.js';

export const workerPool = new WorkerPool();
export const lru = new LRU();

let defaultScriptPath = "";
if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
	defaultScriptPath = new URL(document.currentScript.src + '/..').href;
	if (defaultScriptPath.slice(-1) === '/') {
		defaultScriptPath = defaultScriptPath.slice(0, -1);
	}
} else if (typeof import.meta !== 'undefined' && import.meta.url) {
	try {
		defaultScriptPath = new URL(import.meta.url + "/..").href;
		if (defaultScriptPath.slice(-1) === '/') {
			defaultScriptPath = defaultScriptPath.slice(0, -1);
		}
	} catch (e) {}
}

export const runtime = {
	workerPool,
	lru,
	numNodesLoading: 0,
	maxNodesLoading: 4,
	pointBudget: 1_000_000,
	framenumber: 0,
	debug: {},
	scriptPath: defaultScriptPath,
	resourcePath: defaultScriptPath ? (defaultScriptPath + '/resources') : '',
	setScriptPath(p) {
		this.scriptPath = p;
		if (!this.resourcePath) {
			this.resourcePath = p + '/resources';
		}
	},
	setResourcePath(p) {
		this.resourcePath = p;
	}
};

// Global compatibility bridge for window.Potree
if (typeof window !== 'undefined') {
	window.Potree = window.Potree || {};
	window.Potree.workerPool = workerPool;
	window.Potree.lru = lru;
	window.Potree.runtime = runtime;
	Object.defineProperty(window.Potree, 'numNodesLoading', {
		get() { return runtime.numNodesLoading; },
		set(v) { runtime.numNodesLoading = v; },
		configurable: true
	});
	Object.defineProperty(window.Potree, 'maxNodesLoading', {
		get() { return runtime.maxNodesLoading; },
		set(v) { runtime.maxNodesLoading = v; },
		configurable: true
	});
	Object.defineProperty(window.Potree, 'scriptPath', {
		get() { return runtime.scriptPath; },
		set(v) { runtime.setScriptPath(v); },
		configurable: true
	});
	Object.defineProperty(window.Potree, 'resourcePath', {
		get() { return runtime.resourcePath; },
		set(v) { runtime.setResourcePath(v); },
		configurable: true
	});
}
