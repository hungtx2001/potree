/**
 * PotreeStore - Reactive Headless State Store (TypeScript)
 * Decouples the 3D Engine from UI DOM representations
 */

export interface PotreeState {
	pointBudget: number;
	fov: number;
	edlEnabled: boolean;
	edlRadius: number;
	edlStrength: number;
	cameraMode: string;
	activeTool: string | null;
	background: string;
	theme: string;
	sidebarOpen: boolean;
	activeTab: string;
	pointClouds: any[];
	measurements: any[];
	clippingVolumes: any[];
	[key: string]: any;
}

export type StoreListener = (state: PotreeState, prevState: PotreeState, changedKeys: string[]) => void;
export type KeyListener<T = any> = (newValue: T, oldValue: T) => void;

export class PotreeStore {
	public state: PotreeState;
	private listeners: Set<StoreListener> = new Set();
	private keyListeners: Map<string, Set<KeyListener>> = new Map();

	constructor(initialState: Partial<PotreeState> = {}) {
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
			...initialState,
		};
	}

	public getState(): PotreeState {
		return this.state;
	}

	public get<K extends keyof PotreeState>(key: K): PotreeState[K] {
		return this.state[key];
	}

	public setState(partial: Partial<PotreeState> | ((state: PotreeState) => Partial<PotreeState>)): void {
		const nextState = typeof partial === 'function' ? partial(this.state) : partial;
		const changedKeys: string[] = [];

		for (const key of Object.keys(nextState)) {
			if (this.state[key] !== (nextState as any)[key]) {
				changedKeys.push(key);
			}
		}

		if (changedKeys.length === 0) return;

		const prevState: PotreeState = { ...this.state };
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

	public subscribe(listener: StoreListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	public subscribeKey<K extends keyof PotreeState>(
		key: K,
		listener: KeyListener<PotreeState[K]>
	): () => void {
		const strKey = String(key);
		if (!this.keyListeners.has(strKey)) {
			this.keyListeners.set(strKey, new Set());
		}
		const set = this.keyListeners.get(strKey)!;
		set.add(listener as KeyListener);
		return () => {
			set.delete(listener as KeyListener);
		};
	}
}
