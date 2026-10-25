import * as THREE from 'three';
import { EventDispatcher } from '../EventDispatcher.js';
import { XHRFactory } from '../utils/XHRFactory.js';
import { PointAttribute, PointAttributes } from '../loader/PointAttributes.js';
import { runtime } from '../runtime/runtime.js';

export class PointCloudArena4DGeometryNode {
	left: PointCloudArena4DGeometryNode | null = null;
	right: PointCloudArena4DGeometryNode | null = null;
	parent: PointCloudArena4DGeometryNode | null = null;
	boundingBox: THREE.Box3 = new THREE.Box3();
	boundingSphere: THREE.Sphere = new THREE.Sphere();
	number: number = 0;
	pcoGeometry: PointCloudArena4DGeometry | null = null;
	loaded: boolean = false;
	loading: boolean = false;
	numPoints: number = 0;
	level: number = 0;
	children: PointCloudArena4DGeometryNode[] = [];
	oneTimeDisposeHandlers: Array<() => void> = [];
	geometry: THREE.BufferGeometry | null = null;
	spacing: number = 0;
	estimatedSpacing: number = 0;
	hasLeft: boolean = false;
	hasRight: boolean = false;
	split: 'X' | 'Y' | 'Z' | null = null;
	isLeaf: boolean = false;

	constructor() {}

	isGeometryNode(): boolean {
		return true;
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

	getChildren(): PointCloudArena4DGeometryNode[] {
		const children: PointCloudArena4DGeometryNode[] = [];
		if (this.left) children.push(this.left);
		if (this.right) children.push(this.right);
		return children;
	}

	getLevel(): number {
		return this.level;
	}

	load(): void {
		if (this.loaded || this.loading) {
			return;
		}

		if (runtime.numNodesLoading >= runtime.maxNodesLoading) {
			return;
		}

		this.loading = true;
		runtime.numNodesLoading++;

		const url = this.pcoGeometry!.url + '?node=' + this.number;
		const xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';

		xhr.onreadystatechange = () => {
			if (!(xhr.readyState === 4 && xhr.status === 200)) {
				return;
			}

			const buffer = xhr.response as ArrayBuffer;
			const sourceView = new DataView(buffer);
			const numPoints = Math.floor(buffer.byteLength / 17);
			const position = new Float32Array(numPoints * 3);
			const color = new Uint8Array(numPoints * 4);
			const intensities = new Float32Array(numPoints);
			const classifications = new Uint8Array(numPoints);
			const indices = new ArrayBuffer(numPoints * 4);
			const u32Indices = new Uint32Array(indices);
			const tightBoundingBox = new THREE.Box3();

			for (let i = 0; i < numPoints; i++) {
				const x = sourceView.getFloat32(i * 17 + 0, true) + this.boundingBox.min.x;
				const y = sourceView.getFloat32(i * 17 + 4, true) + this.boundingBox.min.y;
				const z = sourceView.getFloat32(i * 17 + 8, true) + this.boundingBox.min.z;

				const r = sourceView.getUint8(i * 17 + 12);
				const g = sourceView.getUint8(i * 17 + 13);
				const b = sourceView.getUint8(i * 17 + 14);
				const intensity = sourceView.getUint8(i * 17 + 15);
				const classification = sourceView.getUint8(i * 17 + 16);

				tightBoundingBox.expandByPoint(new THREE.Vector3(x, y, z));

				position[i * 3 + 0] = x;
				position[i * 3 + 1] = y;
				position[i * 3 + 2] = z;

				color[i * 4 + 0] = r;
				color[i * 4 + 1] = g;
				color[i * 4 + 2] = b;
				color[i * 4 + 3] = 255;

				intensities[i] = intensity;
				classifications[i] = classification;
				u32Indices[i] = i;
			}

			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
			geometry.setAttribute('color', new THREE.BufferAttribute(color, 4, true));
			geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			geometry.setAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			geometry.setAttribute('indices', new THREE.BufferAttribute(new Uint8Array(indices), 4, true));

			this.geometry = geometry;
			this.numPoints = numPoints;
			this.loaded = true;
			this.loading = false;
			runtime.numNodesLoading--;
		};

		xhr.send(null);
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

	getNumPoints(): number {
		return this.numPoints;
	}
}

export class PointCloudArena4DGeometry extends EventDispatcher {
	numPoints: number = 0;
	version: number = 0;
	boundingBox: THREE.Box3 = new THREE.Box3();
	boundingSphere: THREE.Sphere = new THREE.Sphere();
	offset: THREE.Vector3 = new THREE.Vector3();
	numNodes: number = 0;
	name: string | null = null;
	provider: string | null = null;
	url: string = '';
	root: PointCloudArena4DGeometryNode | null = null;
	levels: number = 0;
	private _spacing: number | null = null;
	pointAttributes: PointAttributes;

	constructor() {
		super();
		this.pointAttributes = new PointAttributes([
			PointAttribute.POSITION_CARTESIAN,
			PointAttribute.RGBA_PACKED
		]);
	}

	static load(url: string, callback: (geometry: PointCloudArena4DGeometry | null) => void): void {
		const xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url + '?info', true);

		xhr.onreadystatechange = () => {
			try {
				if (xhr.readyState === 4 && xhr.status === 200) {
					const response = JSON.parse(xhr.responseText);

					const geometry = new PointCloudArena4DGeometry();
					geometry.url = url;
					geometry.name = response.Name;
					geometry.provider = response.Provider;
					geometry.numNodes = response.Nodes;
					geometry.numPoints = response.Points;
					geometry.version = response.Version;
					geometry.boundingBox = new THREE.Box3(
						new THREE.Vector3().fromArray(response.BoundingBox.slice(0, 3)),
						new THREE.Vector3().fromArray(response.BoundingBox.slice(3, 6))
					);
					if (response.Spacing) {
						geometry.spacing = response.Spacing;
					}

					const offset = geometry.boundingBox.min.clone().multiplyScalar(-1);
					geometry.boundingBox.min.add(offset);
					geometry.boundingBox.max.add(offset);
					geometry.offset = offset;

					const center = geometry.boundingBox.getCenter(new THREE.Vector3());
					const radius = geometry.boundingBox.getSize(new THREE.Vector3()).length() / 2;
					geometry.boundingSphere = new THREE.Sphere(center, radius);

					geometry.loadHierarchy();

					callback(geometry);
				} else if (xhr.readyState === 4) {
					callback(null);
				}
			} catch (e: any) {
				console.error(e.message);
				callback(null);
			}
		};

		xhr.send(null);
	}

	loadHierarchy(): void {
		const url = this.url + '?tree';
		const xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';

		xhr.onreadystatechange = () => {
			if (!(xhr.readyState === 4 && xhr.status === 200)) {
				return;
			}

			const buffer = xhr.response as ArrayBuffer;
			const numNodes = buffer.byteLength / 3;
			const view = new DataView(buffer);
			const stack: PointCloudArena4DGeometryNode[] = [];
			let root: PointCloudArena4DGeometryNode | null = null;
			let levels = 0;

			for (let i = 0; i < numNodes; i++) {
				const mask = view.getUint8(i * 3 + 0);

				const hasLeft = (mask & 1) > 0;
				const hasRight = (mask & 2) > 0;
				const splitX = (mask & 4) > 0;
				const splitY = (mask & 8) > 0;
				const splitZ = (mask & 16) > 0;
				let split: 'X' | 'Y' | 'Z' | null = null;
				if (splitX) {
					split = 'X';
				} else if (splitY) {
					split = 'Y';
				} else if (splitZ) {
					split = 'Z';
				}

				const node = new PointCloudArena4DGeometryNode();
				node.hasLeft = hasLeft;
				node.hasRight = hasRight;
				node.split = split;
				node.isLeaf = !hasLeft && !hasRight;
				node.number = i;
				node.left = null;
				node.right = null;
				node.pcoGeometry = this;
				node.level = stack.length;
				levels = Math.max(levels, node.level);

				if (stack.length > 0) {
					const parent = stack[stack.length - 1];
					node.parent = parent;
					node.boundingBox = parent.boundingBox.clone();
					const parentBBSize = parent.boundingBox.getSize(new THREE.Vector3());

					if (parent.hasLeft && !parent.left) {
						parent.left = node;
						parent.children.push(node);

						if (parent.split === 'X') {
							node.boundingBox.max.x = node.boundingBox.min.x + parentBBSize.x / 2;
						} else if (parent.split === 'Y') {
							node.boundingBox.max.y = node.boundingBox.min.y + parentBBSize.y / 2;
						} else if (parent.split === 'Z') {
							node.boundingBox.max.z = node.boundingBox.min.z + parentBBSize.z / 2;
						}

						const center = node.boundingBox.getCenter(new THREE.Vector3());
						const radius = node.boundingBox.getSize(new THREE.Vector3()).length() / 2;
						node.boundingSphere = new THREE.Sphere(center, radius);
					} else {
						parent.right = node;
						parent.children.push(node);

						if (parent.split === 'X') {
							node.boundingBox.min.x = node.boundingBox.min.x + parentBBSize.x / 2;
						} else if (parent.split === 'Y') {
							node.boundingBox.min.y = node.boundingBox.min.y + parentBBSize.y / 2;
						} else if (parent.split === 'Z') {
							node.boundingBox.min.z = node.boundingBox.min.z + parentBBSize.z / 2;
						}

						const center = node.boundingBox.getCenter(new THREE.Vector3());
						const radius = node.boundingBox.getSize(new THREE.Vector3()).length() / 2;
						node.boundingSphere = new THREE.Sphere(center, radius);
					}
				} else {
					root = node;
					root.boundingBox = this.boundingBox.clone();
					const center = root.boundingBox.getCenter(new THREE.Vector3());
					const radius = root.boundingBox.getSize(new THREE.Vector3()).length() / 2;
					root.boundingSphere = new THREE.Sphere(center, radius);
				}

				const bbSize = node.boundingBox.getSize(new THREE.Vector3());
				node.spacing = ((bbSize.x + bbSize.y + bbSize.z) / 3) / 75;
				node.estimatedSpacing = node.spacing;

				stack.push(node);

				if (node.isLeaf) {
					let done = false;
					while (!done && stack.length > 0) {
						stack.pop();
						const top = stack[stack.length - 1];
						done = stack.length > 0 && top.hasRight && top.right === null;
					}
				}
			}

			this.root = root;
			this.levels = levels;
			this.dispatchEvent({ type: 'hierarchy_loaded' });
		};

		xhr.send(null);
	}

	get spacing(): number | null {
		if (this._spacing) {
			return this._spacing;
		} else if (this.root) {
			return this.root.spacing;
		}
		return null;
	}

	set spacing(value: number | null) {
		this._spacing = value;
	}
}
