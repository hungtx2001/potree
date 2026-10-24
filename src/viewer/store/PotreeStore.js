/**
 * PotreeStore - Reactive Headless State Store
 * Decouples the 3D Engine from UI DOM representations
 */

export class PotreeStore {
	constructor(initialState = {}) {
		this.state = {
			pointBudget: 1_000_000,
			fov: 60,
			edlEnabled: false,
			edlRadius: 1.4,
			edlStrength: 1.0,
			cameraMode: 'perspective',
			activeTool: null,
			background: 'skybox',
			theme: 'dark',
			sidebarOpen: false,
			activeTab: 'appearance',
			pointClouds: [],
			measurements: [],
			clippingVolumes: [],
			...initialState
		};

		this.listeners = new Set();
		this.keyListeners = new Map();
	}

	getState() {
		return this.state;
	}

	get(key) {
		return this.state[key];
	}

	setState(partial) {
		const nextState = typeof partial === 'function' ? partial(this.state) : partial;
		const changedKeys = [];

		for (const key of Object.keys(nextState)) {
			if (this.state[key] !== nextState[key]) {
				changedKeys.push(key);
			}
		}

		if (changedKeys.length === 0) return;

		const prevState = { ...this.state };
		this.state = { ...this.state, ...nextState };

		// Notify global listeners
		for (const listener of this.listeners) {
			try {
				listener(this.state, prevState, changedKeys);
			} catch (e) {
				console.error('[PotreeStore] Error in store listener:', e);
			}
		}

		// Notify key-specific listeners
		for (const key of changedKeys) {
			const listenersForKey = this.keyListeners.get(key);
			if (listenersForKey) {
				for (const listener of listenersForKey) {
					try {
						listener(this.state[key], prevState[key]);
					} catch (e) {
						console.error(`[PotreeStore] Error in key listener for '${key}':`, e);
					}
				}
			}
		}
	}

	subscribe(listener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	subscribeKey(key, listener) {
		if (!this.keyListeners.has(key)) {
			this.keyListeners.set(key, new Set());
		}
		this.keyListeners.get(key).add(listener);
		return () => {
			const set = this.keyListeners.get(key);
			if (set) set.delete(listener);
		};
	}
}
