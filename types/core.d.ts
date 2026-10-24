import * as THREE from 'three';

export interface Version {
	major: number;
	minor: number;
	suffix: string;
}

export declare const version: Version;

export declare enum PointSizeType {
	FIXED = 0,
	ATTENUATED = 1,
	ADAPTIVE = 2
}

export declare enum PointShape {
	SQUARE = 0,
	CIRCLE = 1,
	PARABOLOID = 2
}

export declare enum TreeType {
	OCTREE = 0,
	KD_TREE = 1
}

export declare enum CameraMode {
	ORTHOGRAPHIC = 0,
	PERSPECTIVE = 1
}

export declare enum ClipTask {
	NONE = 0,
	HIGHLIGHT = 1,
	SHOW_INSIDE = 2,
	SHOW_OUTSIDE = 3
}

export declare enum ClipMethod {
	INSIDE_ANY = 0,
	INSIDE_ALL = 1
}

export declare class LRU {
	constructor(capacity?: number);
	touch(node: any): void;
	get(key: string): any;
	set(key: string, value: any): void;
}

export declare class WorkerPool {
	constructor();
	getWorker(urlOrType: string): Worker;
	returnWorker(urlOrType: string, worker: Worker): void;
	registerWorkerFactory(name: string, factory: () => Worker): void;
	setWorkerUrl(name: string, url: string): void;
}

export declare const workerPool: WorkerPool;
export declare const lru: LRU;

export interface PotreeRuntime {
	workerPool: WorkerPool;
	lru: LRU;
	numNodesLoading: number;
	maxNodesLoading: number;
	pointBudget: number;
	framenumber: number;
	debug: Record<string, any>;
	scriptPath: string;
	resourcePath: string;
	setScriptPath(path: string): void;
	setResourcePath(path: string): void;
}

export declare const runtime: PotreeRuntime;

export declare class PointCloudMaterial extends THREE.RawShaderMaterial {
	constructor(parameters?: Record<string, any>);
	size: number;
	minSize: number;
	maxSize: number;
	pointSizeType: PointSizeType;
	shape: PointShape;
	elevationRange: [number, number];
	opacity: number;
}

export declare class EyeDomeLightingMaterial extends THREE.RawShaderMaterial {
	constructor(parameters?: Record<string, any>);
	radius: number;
	strength: number;
}

export declare class PointCloudTreeNode {
	id: number;
	name: string;
	level: number;
	boundingBox: THREE.Box3;
	boundingSphere: THREE.Sphere;
	children: PointCloudTreeNode[];
	numPoints: number;
	loaded: boolean;
	loading: boolean;
}

export declare class PointCloudOctreeGeometry {
	constructor();
	url: string;
	octreeDir: string;
	spacing: number;
	pointAttributes: any;
	hierarchy: any;
	root: PointCloudTreeNode;
	offset: THREE.Vector3;
	projection: string;
	boundingBox: THREE.Box3;
	tightBoundingBox: THREE.Box3;
}

export declare class PointCloudOctree extends THREE.Object3D {
	constructor(geometry?: PointCloudOctreeGeometry, material?: PointCloudMaterial);
	pcoGeometry: PointCloudOctreeGeometry;
	geometry: PointCloudOctreeGeometry;
	material: PointCloudMaterial;
	visiblePoints: PointCloudTreeNode[];
	visibleNodes: PointCloudTreeNode[];
	numVisiblePoints: number;
	pointBudget: number;
	getAttribute(name: string): any;
}

export declare class OctreeLoader {
	static load(url: string): Promise<{ geometry: PointCloudOctreeGeometry }>;
}

export declare class POCLoader {
	static load(url: string, callback: (geometry: PointCloudOctreeGeometry) => void): void;
}

export declare class EptLoader {
	static load(url: string, callback: (geometry: any) => void): Promise<void>;
}

export declare class CopcLoader {
	static load(url: string, callback: (geometry: any) => void): Promise<void>;
}

export interface LoadPointCloudResult {
	type: 'pointcloud_loaded' | 'loading_failed';
	pointcloud: PointCloudOctree;
	error?: Error;
}

export declare function loadPointCloud(
	path: string,
	name?: string,
	callback?: (e: LoadPointCloudResult) => void
): Promise<LoadPointCloudResult>;

export declare function updatePointClouds(
	pointclouds: PointCloudOctree[],
	camera: THREE.Camera,
	renderer: THREE.WebGLRenderer
): { visibleNodes: PointCloudTreeNode[]; numVisiblePoints: number };

export interface PotreeState {
	pointBudget: number;
	fov: number;
	edlEnabled: boolean;
	edlRadius: number;
	edlStrength: number;
	edlOpacity: number;
	background: 'skybox' | 'gradient' | 'black' | 'white' | 'none' | null;
	cameraMode: 'perspective' | 'orthographic';
	moveSpeed: number;
	theme: 'dark' | 'light';
	sidebarOpen: boolean;
	activeTool: string | null;
	pointclouds: any[];
	measurements: any[];
}

export declare class PotreeStore {
	constructor(initialState?: Partial<PotreeState>);
	getState(): PotreeState;
	setState(patch: Partial<PotreeState>): void;
	subscribe(listener: (state: PotreeState, prevState: PotreeState) => void): () => void;
	subscribeKey<K extends keyof PotreeState>(
		key: K,
		listener: (value: PotreeState[K], prevValue: PotreeState[K]) => void
	): () => void;
}
