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

export const version = {
	major: 2,
	minor: 0,
	suffix: '.0-alpha.1'
};

export const runtime = {
	workerPool,
	lru,
	version,
	numNodesLoading: 0,
	maxNodesLoading: 4,
	pointBudget: 1_000_000,
	uploadBudgetMs: 5,
	get pointLoadLimit() {
		return lru.pointLoadLimit;
	},
	set pointLoadLimit(v) {
		lru.pointLoadLimit = v;
	},
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

// Register default module worker factories
if (typeof Worker !== 'undefined') {
	try {
		workerPool.registerWorkerFactory('DecoderWorker', () => {
			return new Worker(new URL('./modules/loader/2.0/DecoderWorker.js', import.meta.url), { type: 'module' });
		});
		workerPool.registerWorkerFactory('DecoderWorker_brotli', () => {
			return new Worker(new URL('./modules/loader/2.0/DecoderWorker_brotli.js', import.meta.url), { type: 'module' });
		});
		workerPool.registerWorkerFactory('BinaryDecoderWorker', () => {
			return new Worker(new URL('./workers/BinaryDecoderWorker.js', import.meta.url), { type: 'module' });
		});
	} catch (e) {
		// Ignore if import.meta.url or Worker not supported
	}
}

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
