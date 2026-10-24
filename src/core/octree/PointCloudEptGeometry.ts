import { PointCloudTreeNode } from './PointCloudTree.js';
import { PointAttributes, PointAttribute, PointAttributeTypes } from '../loader/PointAttributes.js';
import * as THREE from 'three';
import proj4 from 'proj4';
import { Copc, Key, Bounds, Ept } from 'copc';
import { Version } from '../../Version.js';
import { CopcLaszipLoader, EptLaszipLoader } from '../../loader/ept/LaszipLoader.js';
import { EptBinaryLoader } from '../../loader/ept/BinaryLoader.js';
import { EptZstandardLoader } from '../../loader/ept/ZstandardLoader.js';
import { runtime } from '../runtime/index.js';

class U {
	static toVector3(v: number[], offset: number = 0): THREE.Vector3 {
		return new THREE.Vector3().fromArray(v, offset || 0);
	}

	static toBox3(b: number[]): THREE.Box3 {
		return new THREE.Box3(U.toVector3(b), U.toVector3(b, 3));
	}

	static findDim(schema: any[], name: string): any {
		const dim = schema.find((d: any) => d.name === name);
		if (!dim) throw new Error('Failed to find ' + name + ' in schema');
		return dim;
	}

	static sphereFrom(b: THREE.Box3): THREE.Sphere {
		return b.getBoundingSphere(new THREE.Sphere());
	}

	static toPotreeName([d, x, y, z]: [number, number, number, number]): string {
		let name = 'r';
		for (let i = 0; i < d; ++i) {
			const shift = d - i - 1;
			const mask = 1 << shift;
			let step = 0;

			if (x & mask) step += 4;
			if (y & mask) step += 2;
			if (z & mask) step += 1;

			name += step;
		}
		return name;
	}

	static maybeSrs(srs: string): string | undefined {
		try {
			(proj4 as any)(srs);
			return srs;
		} catch (_e) {
			return undefined;
		}
	}
}

class BaseGeometry {
	public cube: number[];
	public boundingBox: THREE.Box3;
	public tightBoundingBox: THREE.Box3;
	public boundingSphere: THREE.Sphere;
	public tightBoundingSphere: THREE.Sphere;
	public root: any = null;
	public offset: THREE.Vector3;
	public version: Version;
	public loader: any;
	public spacing: number;
	public projection: any;
	public pointAttributes: PointAttributes;

	constructor({
		cube,
		boundsConforming,
		spacing,
		srs,
	}: {
		cube: number[];
		boundsConforming: number[];
		spacing: number;
		srs?: string;
	}) {
		this.cube = cube;
		this.boundingBox = U.toBox3(cube);
		this.tightBoundingBox = U.toBox3(boundsConforming);
		this.boundingSphere = U.sphereFrom(this.boundingBox);
		this.tightBoundingSphere = U.sphereFrom(this.tightBoundingBox);
		this.offset = U.toVector3([0, 0, 0]);
		this.version = new Version('1.7');

		this.loader = new CopcLaszipLoader();
		this.spacing = spacing;
		this.projection = srs || null;

		try {
			(proj4 as any)(this.projection);
		} catch (_e) {
			this.projection = null;
		}

		const attributes = new PointAttributes();
		attributes.add(PointAttribute.POSITION_CARTESIAN);
		attributes.add(new PointAttribute('rgba', PointAttributeTypes.DATA_TYPE_UINT8, 4));
		attributes.add(new PointAttribute('intensity', PointAttributeTypes.DATA_TYPE_UINT16, 1));
		attributes.add(new PointAttribute('classification', PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute('gps-time', PointAttributeTypes.DATA_TYPE_FLOAT, 1));
		attributes.add(new PointAttribute('returnNumber', PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute('number of returns', PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute('return number', PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute('source id', PointAttributeTypes.DATA_TYPE_UINT16, 1));
		this.pointAttributes = attributes;
	}
}

export class PointCloudCopcGeometry extends BaseGeometry {
	public type: string = 'copc';
	public getter: any;
	public copc: any;
	public pages: Record<string, any>;

	static parse({ header, info, wkt }: any): any {
		return {
			cube: info.cube,
			boundsConforming: [...header.min, ...header.max],
			spacing: info.spacing,
			srs: wkt,
		};
	}

	constructor(getter: any, copc: any) {
		super(PointCloudCopcGeometry.parse(copc));

		this.type = 'copc';
		this.getter = getter;
		this.copc = copc;
		this.pages = { '0-0-0-0': copc.info.rootHierarchyPage };
		this.loader = new CopcLaszipLoader();
	}

	async loadHierarchyPage(key: any): Promise<any> {
		const page = this.pages[Key.toString(key)];
		return Copc.loadHierarchyPage(this.getter, page);
	}
}

export class PointCloudEptGeometry extends BaseGeometry {
	public type: string = 'ept';
	public base: string;
	public ept: any;

	static parse(ept: any): any {
		const { bounds: cube, boundsConforming, span, srs: filesrs } = ept;
		const spacing = (cube[3] - cube[0]) / span;

		let srs: string | undefined;
		if (filesrs) {
			const { authority, horizontal, wkt } = filesrs;
			if (authority && horizontal) {
				srs = U.maybeSrs(`${authority}:${horizontal}`);
			}
			if (!srs && wkt) srs = U.maybeSrs(wkt);
		}

		return { cube, boundsConforming, spacing, srs };
	}

	constructor(base: string, ept: any) {
		super(PointCloudEptGeometry.parse(ept));

		this.type = 'ept';
		this.base = base;
		this.ept = ept;

		this.loader = (() => {
			switch (ept.dataType) {
				case 'laszip': return new EptLaszipLoader();
				case 'binary': return new EptBinaryLoader();
				case 'zstandard': return new EptZstandardLoader();
				default: throw new Error('Invalid data type: ' + ept.dataType);
			}
		})();
	}

	async loadHierarchyPage(key: any): Promise<any> {
		const filename = `${this.base}/ept-hierarchy/${Key.toString(key)}.json`;
		const response = await fetch(filename);
		const json = await response.json();
		return Ept.Hierarchy.parse(json);
	}
}

export class PointCloudCopcGeometryNode extends PointCloudTreeNode {
	public static IDCount: number = 0;

	public owner: any;
	public key: any;
	public bounds: any;
	public id: number;
	public geometry: any = null;
	public boundingBox: THREE.Box3;
	public tightBoundingBox: THREE.Box3;
	public spacing: number;
	public boundingSphere: THREE.Sphere;
	public hasChildren: boolean = false;
	public children: Record<number, any> = {};
	public nodeinfo?: any;
	public numPoints: number = -1;
	public level: number;
	public loaded: boolean = false;
	public loading: boolean = false;
	public oneTimeDisposeHandlers: (() => void)[] = [];
	public name: string;
	public index: number;
	public parent: any = null;
	public mean: any;

	constructor(owner: any, key?: any, bounds?: any) {
		super();

		this.owner = owner;
		this.key = key || Key.create(0, 0, 0, 0);
		this.bounds = bounds || owner.cube;

		this.id = PointCloudCopcGeometryNode.IDCount++;
		this.geometry = null;
		this.boundingBox = U.toBox3(this.bounds);
		this.tightBoundingBox = this.boundingBox;
		this.spacing = this.owner.spacing / Math.pow(2, Key.depth(this.key));
		this.boundingSphere = U.sphereFrom(this.boundingBox);

		this.hasChildren = false;
		this.children = {};
		this.nodeinfo = undefined;
		this.numPoints = -1;

		this.level = Key.depth(this.key);
		this.loaded = false;
		this.loading = false;
		this.oneTimeDisposeHandlers = [];

		this.name = U.toPotreeName(this.key);
		this.index = parseInt(this.name.charAt(this.name.length - 1), 10);
	}

	isGeometryNode(): boolean { return true; }
	getLevel(): number { return this.level; }
	isTreeNode(): boolean { return false; }
	isLoaded(): boolean { return this.loaded; }
	getBoundingSphere(): THREE.Sphere { return this.boundingSphere; }
	getBoundingBox(): THREE.Box3 { return this.boundingBox; }
	getNumPoints(): number {
		return this.nodeinfo ? this.nodeinfo.pointCount : -1;
	}

	getChildren(): any[] {
		const children: any[] = [];
		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}
		return children;
	}

	addChild(child: any): void {
		this.children[child.index] = child;
		child.parent = this;
	}

	async load(): Promise<void> {
		if (this.loaded || this.loading) return;
		if (runtime.numNodesLoading >= runtime.maxNodesLoading) return;

		this.loading = true;
		++runtime.numNodesLoading;

		if (!this.nodeinfo) await this.loadHierarchy();
		this.loadPoints();
	}

	loadPoints(): void {
		this.owner.loader.load(this);
	}

	async loadHierarchy(): Promise<void> {
		const ourkeyname = Key.toString(this.key);
		const nodemap: Record<string, any> = {};
		nodemap[ourkeyname] = this;
		this.hasChildren = false;

		const { nodes, pages } = await this.owner.loadHierarchyPage(this.key);
		const keys = Object.keys({ ...nodes, ...pages })
			.map(k => Key.create(k as any))
			.sort(Key.compare);

		keys.forEach((key: any) => {
			const keyname = Key.toString(key);
			if (keyname === ourkeyname) {
				this.nodeinfo = nodes[keyname];
				return;
			}

			const [_d, x, y, z] = key;
			const step = [x & 1, y & 1, z & 1];

			const parentName = Key.toString(Key.up(key));
			const parentNode = nodemap[parentName];
			if (!parentNode) return;
			parentNode.hasChildren = true;

			const bounds = Bounds.step(parentNode.bounds, step as any);
			const node = new PointCloudCopcGeometryNode(this.owner, key, bounds);
			parentNode.addChild(node);
			nodemap[keyname] = node;

			const nodeinfo = nodes[keyname];
			if (nodeinfo) node.nodeinfo = nodeinfo;

			const pageinfo = pages[keyname];
			if (this.owner.pages && pageinfo) {
				this.owner.pages[keyname] = pageinfo;
			}
		});
	}

	doneLoading(bufferGeometry: any, tightBoundingBox: any, np: number, mean: any): void {
		bufferGeometry.boundingBox = this.boundingBox;
		this.geometry = bufferGeometry;
		this.tightBoundingBox = tightBoundingBox;
		this.numPoints = np;
		this.mean = mean;
		this.loaded = true;
		this.loading = false;
		--runtime.numNodesLoading;
	}

	dispose(): void {
		if (this.geometry && this.parent) {
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
