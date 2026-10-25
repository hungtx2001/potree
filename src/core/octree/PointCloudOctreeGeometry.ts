import * as THREE from 'three';
import { PointCloudTreeNode } from './PointCloudTree.js';
import { XHRFactory } from '../utils/XHRFactory.js';
import { Utils } from '../utils/Utils.js';
import { runtime } from '../runtime/runtime.js';

export class PointCloudOctreeGeometry {
	public url: string | null = null;
	public octreeDir: string | null = null;
	public spacing: number = 0;
	public boundingBox: THREE.Box3 | null = null;
	public tightBoundingBox: THREE.Box3 | null = null;
	public boundingSphere: THREE.Sphere | null = null;
	public tightBoundingSphere: THREE.Sphere | null = null;
	public root: PointCloudOctreeGeometryNode | null = null;
	public nodes: Record<string, PointCloudOctreeGeometryNode> | null = null;
	public pointAttributes: any = null;
	public hierarchyStepSize: number = -1;
	public loader: any = null;
	public projection: any = null;
	public offset: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

	constructor() {
		this.url = null;
		this.octreeDir = null;
		this.spacing = 0;
		this.boundingBox = null;
		this.root = null;
		this.nodes = null;
		this.pointAttributes = null;
		this.hierarchyStepSize = -1;
		this.loader = null;
	}
}

export class PointCloudOctreeGeometryNode extends PointCloudTreeNode {
	public static IDCount: number = 0;

	public id: number;
	public name: string;
	public index: number;
	public pcoGeometry: PointCloudOctreeGeometry;
	public geometry: any = null;
	public boundingBox: THREE.Box3;
	public boundingSphere: THREE.Sphere;
	public children: Record<number, PointCloudOctreeGeometryNode> = {};
	public numPoints: number = 0;
	public level: number = 0;
	public loaded: boolean = false;
	public loading: boolean = false;
	public oneTimeDisposeHandlers: (() => void)[] = [];
	public parent: PointCloudOctreeGeometryNode | null = null;
	public spacing: number = 0;
	public hasChildren: boolean = false;
	public byteOffset?: number;
	public byteSize?: number;

	constructor(name: string, pcoGeometry: PointCloudOctreeGeometry, boundingBox: THREE.Box3) {
		super();

		this.id = PointCloudOctreeGeometryNode.IDCount++;
		this.name = name;
		this.index = parseInt(name.charAt(name.length - 1), 10) || 0;
		this.pcoGeometry = pcoGeometry;
		this.geometry = null;
		this.boundingBox = boundingBox;
		this.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		this.children = {};
		this.numPoints = 0;
		this.level = 0;
		this.loaded = false;
		this.oneTimeDisposeHandlers = [];
	}

	public isGeometryNode(): boolean {
		return true;
	}

	public getLevel(): number {
		return this.level;
	}

	public isTreeNode(): boolean {
		return false;
	}

	public isLoaded(): boolean {
		return this.loaded;
	}

	public getBoundingSphere(): THREE.Sphere {
		return this.boundingSphere;
	}

	public getBoundingBox(): THREE.Box3 {
		return this.boundingBox;
	}

	public getChildren(): PointCloudOctreeGeometryNode[] {
		const children: PointCloudOctreeGeometryNode[] = [];
		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}
		return children;
	}

	public getURL(): string {
		let url = '';
		const version = this.pcoGeometry.loader.version;

		if (version.equalOrHigher('1.5')) {
			url = `${this.pcoGeometry.octreeDir}/${this.getHierarchyPath()}/${this.name}`;
		} else if (version.equalOrHigher('1.4')) {
			url = `${this.pcoGeometry.octreeDir}/${this.name}`;
		} else if (version.upTo('1.3')) {
			url = `${this.pcoGeometry.octreeDir}/${this.name}`;
		}

		return url;
	}

	public getHierarchyPath(): string {
		let path = 'r/';
		const hierarchyStepSize = this.pcoGeometry.hierarchyStepSize;
		const indices = this.name.substring(1);

		const numParts = Math.floor(indices.length / hierarchyStepSize);
		for (let i = 0; i < numParts; i++) {
			path += `${indices.substring(i * hierarchyStepSize, (i + 1) * hierarchyStepSize)}/`;
		}

		path = path.slice(0, -1);
		return path;
	}

	public addChild(child: PointCloudOctreeGeometryNode): void {
		this.children[child.index] = child;
		child.parent = this;
	}

	public load(): void {
		if (this.loading === true || this.loaded === true || runtime.numNodesLoading >= runtime.maxNodesLoading) {
			return;
		}

		this.loading = true;
		runtime.numNodesLoading++;

		if (this.pcoGeometry.loader.version.equalOrHigher('1.5')) {
			if ((this.level % this.pcoGeometry.hierarchyStepSize) === 0 && this.hasChildren) {
				this.loadHierachyThenPoints();
			} else {
				this.loadPoints();
			}
		} else {
			this.loadPoints();
		}
	}

	public loadPoints(): void {
		this.pcoGeometry.loader.load(this);
	}

	public loadHierachyThenPoints(): void {
		const node = this;

		const callback = (targetNode: PointCloudOctreeGeometryNode, hbuffer: ArrayBuffer) => {
			const view = new DataView(hbuffer);
			const stack: { children: number; numPoints: number; name: string }[] = [];
			const children = view.getUint8(0);
			const numPoints = view.getUint32(1, true);
			targetNode.numPoints = numPoints;
			stack.push({ children, numPoints, name: targetNode.name });

			const decoded: { children: number; numPoints: number; name: string }[] = [];
			let offset = 5;

			while (stack.length > 0) {
				const snode = stack.shift()!;
				let mask = 1;
				for (let i = 0; i < 8; i++) {
					if ((snode.children & mask) !== 0) {
						const childName = snode.name + i;
						const childChildren = view.getUint8(offset);
						const childNumPoints = view.getUint32(offset + 1, true);

						stack.push({ children: childChildren, numPoints: childNumPoints, name: childName });
						decoded.push({ children: childChildren, numPoints: childNumPoints, name: childName });

						offset += 5;
					}
					mask = mask * 2;
				}

				if (offset === hbuffer.byteLength) {
					break;
				}
			}

			const nodes: Record<string, PointCloudOctreeGeometryNode> = {};
			nodes[targetNode.name] = targetNode;
			const pco = targetNode.pcoGeometry;

			for (let i = 0; i < decoded.length; i++) {
				const name = decoded[i].name;
				const decodedNumPoints = decoded[i].numPoints;
				const index = parseInt(name.charAt(name.length - 1), 10);
				const parentName = name.substring(0, name.length - 1);
				const parentNode = nodes[parentName];
				const level = name.length - 1;
				const boundingBox = Utils.createChildAABB(parentNode.boundingBox, index);

				const currentNode = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
				currentNode.level = level;
				currentNode.numPoints = decodedNumPoints;
				currentNode.hasChildren = decoded[i].children > 0;
				currentNode.spacing = pco.spacing / Math.pow(2, level);
				parentNode.addChild(currentNode);
				nodes[name] = currentNode;
			}

			targetNode.loadPoints();
		};

		if ((node.level % node.pcoGeometry.hierarchyStepSize) === 0) {
			const hurl = `${node.pcoGeometry.octreeDir}/${node.getHierarchyPath()}/${node.name}.hrc`;

			const xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', hurl, true);
			xhr.responseType = 'arraybuffer';
			xhr.overrideMimeType('text/plain; charset=x-user-defined');
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200 || xhr.status === 0) {
						const hbuffer = xhr.response;
						callback(node, hbuffer);
					} else {
						console.log(`Failed to load file! HTTP status: ${xhr.status}, file: ${hurl}`);
						runtime.numNodesLoading--;
					}
				}
			};
			try {
				xhr.send(null);
			} catch (e) {
				console.log('Error loading point cloud hierarchy: ' + e);
			}
		}
	}

	public getNumPoints(): number {
		return this.numPoints;
	}

	public dispose(): void {
		if (this.geometry && this.parent != null) {
			this.geometry.dispose();
			this.geometry = null;
			this.loaded = false;

			this.dispatchEvent({ type: 'dispose' });

			for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
				const handler = this.oneTimeDisposeHandlers[i];
				handler();
			}
			this.oneTimeDisposeHandlers = [];
		}
	}
}
