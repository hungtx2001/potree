import * as THREE from 'three';
import { runtime } from '../runtime/runtime.js';
import type { PointAttributes } from './PointAttributes.js';

export class OctreeGeometry {
	public url: string | null = null;
	public spacing: number = 0;
	public boundingBox: THREE.Box3 | null = null;
	public tightBoundingBox: THREE.Box3 | null = null;
	public boundingSphere: THREE.Sphere | null = null;
	public tightBoundingSphere: THREE.Sphere | null = null;
	public offset: THREE.Vector3 = new THREE.Vector3();
	public scale: [number, number, number] | number = 1;
	public projection?: any;
	public root: OctreeGeometryNode | null = null;
	public pointAttributes: PointAttributes | null = null;
	public loader: any = null;

	constructor() {
		this.url = null;
		this.spacing = 0;
		this.boundingBox = null;
		this.root = null;
		this.pointAttributes = null;
		this.loader = null;
	}
}

export class OctreeGeometryNode {
	public static IDCount: number = 0;

	public id: number;
	public name: string;
	public index: number;
	public octreeGeometry: OctreeGeometry;
	public boundingBox: THREE.Box3;
	public boundingSphere: THREE.Sphere;
	public children: { [key: number]: OctreeGeometryNode } = {};
	public numPoints: number = 0;
	public level: number = 0;
	public oneTimeDisposeHandlers: Array<() => void> = [];
	public geometry: THREE.BufferGeometry | null = null;
	public loaded: boolean = false;
	public loading: boolean = false;
	public parent: OctreeGeometryNode | null = null;
	public spacing: number = 0;
	public nodeType: number = 0;
	public byteOffset: bigint | number = 0;
	public byteSize: bigint | number = 0;
	public hierarchyByteOffset: bigint | number = 0;
	public hierarchyByteSize: bigint | number = 0;
	public hasChildren: boolean = false;
	public density?: number;

	constructor(name: string, octreeGeometry: OctreeGeometry, boundingBox: THREE.Box3) {
		this.id = OctreeGeometryNode.IDCount++;
		this.name = name;
		this.index = parseInt(name.charAt(name.length - 1), 10);
		this.octreeGeometry = octreeGeometry;
		this.boundingBox = boundingBox;
		this.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		this.children = {};
		this.numPoints = 0;
		this.level = 0;
		this.oneTimeDisposeHandlers = [];
	}

	isGeometryNode(): boolean {
		return true;
	}

	getLevel(): number {
		return this.level;
	}

	isTreeNode(): boolean {
		return false;
	}

	isLoaded(): boolean {
		return this.loaded;
	}

	getBoundingSphere(): THREE.Sphere {
		return this.boundingSphere;
	}

	getBoundingBox(): THREE.Box3 {
		return this.boundingBox;
	}

	getChildren(): OctreeGeometryNode[] {
		const children: OctreeGeometryNode[] = [];
		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}
		return children;
	}

	load(): void {
		if (runtime.numNodesLoading >= runtime.maxNodesLoading) {
			return;
		}
		if (this.octreeGeometry && this.octreeGeometry.loader) {
			this.octreeGeometry.loader.load(this);
		}
	}

	getNumPoints(): number {
		return this.numPoints;
	}

	dispose(): void {
		if (this.geometry && this.parent != null) {
			this.geometry.dispose();
			this.geometry = null;
			this.loaded = false;

			for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
				const handler = this.oneTimeDisposeHandlers[i];
				handler();
			}
			this.oneTimeDisposeHandlers = [];
		}
	}
}
