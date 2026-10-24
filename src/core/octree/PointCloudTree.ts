import * as THREE from 'three';
import { EventDispatcher } from '../EventDispatcher.js';

export class PointCloudTreeNode extends EventDispatcher {
	public needsTransformUpdate: boolean = true;
	public children: any[] | Record<string | number, any> = [];
	public geometryNode: any;
	public sceneNode: any;
	public octree: any;

	constructor() {
		super();
		this.needsTransformUpdate = true;
	}

	public getChildren(): any[] {
		throw new Error('override function');
	}

	public getBoundingBox(): THREE.Box3 {
		throw new Error('override function');
	}

	public isLoaded(): boolean {
		throw new Error('override function');
	}

	public isGeometryNode(): boolean {
		throw new Error('override function');
	}

	public isTreeNode(): boolean {
		throw new Error('override function');
	}

	public getLevel(): number {
		throw new Error('override function');
	}

	public getBoundingSphere(): THREE.Sphere {
		throw new Error('override function');
	}
}

export class PointCloudTree extends THREE.Object3D {
	public root: any = null;

	constructor() {
		super();
	}

	public initialized(): boolean {
		return this.root !== null;
	}
}
