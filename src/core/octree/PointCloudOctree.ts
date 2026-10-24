import * as THREE from 'three';
import { PointCloudTree, PointCloudTreeNode } from './PointCloudTree.js';
import { PointCloudOctreeGeometry, PointCloudOctreeGeometryNode } from './PointCloudOctreeGeometry.js';
import { Utils } from '../../utils.js';
import { PointCloudMaterial } from '../materials/PointCloudMaterial.js';
import { ProfileRequest } from '../../ProfileRequest.js';
import { PointShape, ClipTask } from '../types.js';
import { runtime } from '../runtime/index.js';

export class PointCloudOctreeNode extends PointCloudTreeNode {
	public children: any[] = [];
	public sceneNode: THREE.Points | null = null;
	public octree: PointCloudOctree | null = null;
	public pointcloud: PointCloudOctree | null = null;
	public pcIndex?: number;

	constructor() {
		super();
		this.children = [];
		this.sceneNode = null;
		this.octree = null;
	}

	public getNumPoints(): number {
		return this.geometryNode.numPoints;
	}

	public isLoaded(): boolean {
		return true;
	}

	public isTreeNode(): boolean {
		return true;
	}

	public isGeometryNode(): boolean {
		return false;
	}

	public getLevel(): number {
		return this.geometryNode.level;
	}

	public getBoundingSphere(): THREE.Sphere {
		return this.geometryNode.boundingSphere;
	}

	public getBoundingBox(): THREE.Box3 {
		return this.geometryNode.boundingBox;
	}

	public getChildren(): any[] {
		const children: any[] = [];
		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}
		return children;
	}

	public getPointsInBox(boxNode: THREE.Object3D): THREE.Vector3[] | null {
		if (!this.sceneNode) {
			return null;
		}

		const buffer = this.geometryNode.buffer;
		const posOffset = buffer.offset('position');
		const stride = buffer.stride;
		const view = new DataView(buffer.data);

		const worldToBox = boxNode.matrixWorld.clone().invert();
		const objectToBox = new THREE.Matrix4().multiplyMatrices(worldToBox, this.sceneNode.matrixWorld);

		const inBox: THREE.Vector3[] = [];
		const pos = new THREE.Vector4();

		for (let i = 0; i < buffer.numElements; i++) {
			const x = view.getFloat32(i * stride + posOffset + 0, true);
			const y = view.getFloat32(i * stride + posOffset + 4, true);
			const z = view.getFloat32(i * stride + posOffset + 8, true);

			pos.set(x, y, z, 1);
			pos.applyMatrix4(objectToBox);

			if (-0.5 < pos.x && pos.x < 0.5) {
				if (-0.5 < pos.y && pos.y < 0.5) {
					if (-0.5 < pos.z && pos.z < 0.5) {
						pos.set(x, y, z, 1).applyMatrix4(this.sceneNode.matrixWorld);
						inBox.push(new THREE.Vector3(pos.x, pos.y, pos.z));
					}
				}
			}
		}

		return inBox;
	}

	public get name(): string {
		return this.geometryNode ? this.geometryNode.name : '';
	}
}

export class PointCloudOctree extends PointCloudTree {
	public pointBudget: number = Infinity;
	public pcoGeometry: any;
	public boundingBox: THREE.Box3;
	public boundingSphere: THREE.Sphere;
	public material: PointCloudMaterial;
	public visiblePointsTarget: number = 2 * 1000 * 1000;
	public minimumNodePixelSize: number = 150;
	public level: number = 0;
	public showBoundingBox: boolean = false;
	public boundingBoxNodes: any[] = [];
	public loadQueue: any[] = [];
	public visibleBounds: THREE.Box3 = new THREE.Box3();
	public visibleNodes: PointCloudOctreeNode[] = [];
	public visibleGeometry: any[] = [];
	public generateDEM: boolean = false;
	public profileRequests: any[] = [];
	public projection: any;
	public fallbackProjection: any;
	public visibleNodeTextureOffsets?: Map<any, number>;
	public pickState?: {
		renderTarget: THREE.WebGLRenderTarget;
		material: PointCloudMaterial;
		scene: THREE.Scene;
	};
	public signedDistanceField?: {
		resolution: number;
		field: Float32Array;
	};

	private _visible: boolean = true;

	constructor(geometry: any, material?: PointCloudMaterial) {
		super();

		this.pointBudget = Infinity;
		this.pcoGeometry = geometry;
		this.boundingBox = this.pcoGeometry.boundingBox || new THREE.Box3();
		this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());
		this.material = material || new PointCloudMaterial();
		this.visiblePointsTarget = 2 * 1000 * 1000;
		this.minimumNodePixelSize = 150;
		this.level = 0;
		if (geometry.offset) {
			this.position.copy(geometry.offset);
		}
		this.updateMatrix();

		if (this.pcoGeometry.pointAttributes?.attributes) {
			const priorityQueue = ['rgba', 'rgb', 'intensity', 'classification'];
			let selected = 'rgba';

			for (const attributeName of priorityQueue) {
				const attribute = this.pcoGeometry.pointAttributes.attributes.find((a: any) => a.name === attributeName);
				if (!attribute) continue;

				if (attribute.range) {
					const min = Array.isArray(attribute.range[0]) ? attribute.range[0] : [attribute.range[0]];
					const max = Array.isArray(attribute.range[1]) ? attribute.range[1] : [attribute.range[1]];
					const range_min = new THREE.Vector3(...min);
					const range_max = new THREE.Vector3(...max);
					const range = range_min.distanceTo(range_max);
					if (range === 0) continue;
				}

				selected = attributeName;
				break;
			}

			this.material.activeAttributeName = selected;
		}

		this.showBoundingBox = false;
		this.boundingBoxNodes = [];
		this.loadQueue = [];
		this.visibleBounds = new THREE.Box3();
		this.visibleNodes = [];
		this.visibleGeometry = [];
		this.generateDEM = false;
		this.profileRequests = [];
		this.name = '';
		this._visible = true;

		{
			let box = [this.pcoGeometry.tightBoundingBox, this.getBoundingBoxWorld()]
				.find(v => v !== undefined);

			if (box) {
				this.updateMatrixWorld(true);
				box = Utils.computeTransformedBoundingBox(box, this.matrixWorld);

				const bMin = box.min.z;
				const bMax = box.max.z;
				this.material.heightMin = bMin;
				this.material.heightMax = bMax;
			}
		}

		this.projection = geometry.projection;
		this.fallbackProjection = geometry.fallbackProjection;
		this.root = this.pcoGeometry.root;

		Object.defineProperty(this, 'visible', {
			get: () => this._visible,
			set: (value: boolean) => {
				if (value !== this._visible) {
					this._visible = value;
					this.dispatchEvent({ type: 'visibility_changed', pointcloud: this });
				}
			},
			configurable: true,
			enumerable: true,
		});
	}

	public setName(name: string): void {
		if (this.name !== name) {
			this.name = name;
			this.dispatchEvent({ type: 'name_changed', name: name, pointcloud: this });
		}
	}

	public getName(): string {
		return this.name;
	}

	public getAttribute(name: string): any {
		if (!this.pcoGeometry?.pointAttributes?.attributes) return null;
		const attribute = this.pcoGeometry.pointAttributes.attributes.find((a: any) => a.name === name);
		return attribute || null;
	}

	public getAttributes(): any {
		return this.pcoGeometry.pointAttributes;
	}

	public toTreeNode(geometryNode: any, parent: any): PointCloudOctreeNode {
		const node = new PointCloudOctreeNode();
		const sceneNode = new THREE.Points(geometryNode.geometry, this.material as any);
		sceneNode.name = geometryNode.name;
		sceneNode.position.copy(geometryNode.boundingBox.min);
		sceneNode.frustumCulled = false;
		sceneNode.onBeforeRender = (_this: any, _scene: any, _camera: any, _geometry: any, material: any) => {
			if (material.program) {
				_this.getContext().useProgram(material.program.program);

				if (material.program.getUniforms().map.level) {
					const level = geometryNode.getLevel();
					material.uniforms.level.value = level;
					material.program.getUniforms().map.level.setValue(_this.getContext(), level);
				}

				if (this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart) {
					const vnStart = this.visibleNodeTextureOffsets.get(node);
					material.uniforms.vnStart.value = vnStart;
					material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
				}

				if (material.program.getUniforms().map.pcIndex) {
					const i = node.pcIndex !== undefined ? node.pcIndex : this.visibleNodes.indexOf(node);
					material.uniforms.pcIndex.value = i;
					material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), i);
				}
			}
		};

		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.pointcloud = this;
		node.children = [];
		for (let i = 0; i < 8; i++) {
			node.children[i] = geometryNode.children[i];
		}

		if (!parent) {
			this.root = node;
			this.add(sceneNode);
		} else {
			const childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1], 10);
			parent.sceneNode.add(sceneNode);
			parent.children[childIndex] = node;
		}

		const disposeListener = () => {
			const childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1], 10);
			if (parent.sceneNode) {
				parent.sceneNode.remove(node.sceneNode);
			}
			parent.children[childIndex] = geometryNode;
		};
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);

		return node;
	}

	public updateVisibleBounds(): void {
		const leafNodes: PointCloudOctreeNode[] = [];
		for (let i = 0; i < this.visibleNodes.length; i++) {
			const node = this.visibleNodes[i];
			let isLeaf = true;

			for (let j = 0; j < node.children.length; j++) {
				const child = node.children[j];
				if (child instanceof PointCloudOctreeNode) {
					isLeaf = isLeaf && !(child.sceneNode && child.sceneNode.visible);
				} else if (child instanceof PointCloudOctreeGeometryNode) {
					isLeaf = true;
				}
			}

			if (isLeaf) {
				leafNodes.push(node);
			}
		}

		this.visibleBounds.min = new THREE.Vector3(Infinity, Infinity, Infinity);
		this.visibleBounds.max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
		for (let i = 0; i < leafNodes.length; i++) {
			const node = leafNodes[i];
			this.visibleBounds.expandByPoint(node.getBoundingBox().min);
			this.visibleBounds.expandByPoint(node.getBoundingBox().max);
		}
	}

	public updateMaterial(material: any, _visibleNodes: any, camera: any, renderer: any): void {
		material.fov = camera.fov * (Math.PI / 180);
		material.screenWidth = renderer.domElement.clientWidth;
		material.screenHeight = renderer.domElement.clientHeight;
		material.spacing = this.pcoGeometry.spacing;
		material.near = camera.near;
		material.far = camera.far;
		if (material.uniforms?.octreeSize && this.pcoGeometry?.boundingBox) {
			material.uniforms.octreeSize.value = this.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;
		}
	}

	public computeVisibilityTextureData(nodes: PointCloudOctreeNode[], _camera?: any): { data: Uint8Array; offsets: Map<any, number> } {
		if (runtime.debug.measureTimings) performance.mark('computeVisibilityTextureData-start');

		const data = new Uint8Array(nodes.length * 4);
		const visibleNodeTextureOffsets = new Map<any, number>();

		const sortedNodes = nodes.slice().sort((a, b) => {
			const na = a.geometryNode.name;
			const nb = b.geometryNode.name;
			if (na.length !== nb.length) return na.length - nb.length;
			if (na < nb) return -1;
			if (na > nb) return 1;
			return 0;
		});

		const nodeMap = new Map<string, PointCloudOctreeNode>();
		const offsetsToChild = new Array(sortedNodes.length).fill(Infinity);

		for (let i = 0; i < sortedNodes.length; i++) {
			const node = sortedNodes[i];
			nodeMap.set(node.name, node);
			visibleNodeTextureOffsets.set(node, i);

			if (i > 0) {
				const index = parseInt(node.name.slice(-1), 10);
				const parentName = node.name.slice(0, -1);
				const parent = nodeMap.get(parentName);
				if (parent) {
					const parentOffset = visibleNodeTextureOffsets.get(parent)!;
					const parentOffsetToChild = i - parentOffset;

					offsetsToChild[parentOffset] = Math.min(offsetsToChild[parentOffset], parentOffsetToChild);
					data[parentOffset * 4 + 0] = data[parentOffset * 4 + 0] | (1 << index);
					data[parentOffset * 4 + 1] = (offsetsToChild[parentOffset] >> 8);
					data[parentOffset * 4 + 2] = (offsetsToChild[parentOffset] % 256);
				}
			}

			const density = node.geometryNode.density;
			if (typeof density === 'number' && !Number.isNaN(density)) {
				const lodOffset = Math.log2(density) / 2 - 1.5;
				const offsetUint8 = (lodOffset + 10) * 10;
				data[i * 4 + 3] = offsetUint8;
			} else {
				data[i * 4 + 3] = 100;
			}
		}

		if (runtime.debug.measureTimings) {
			performance.mark('computeVisibilityTextureData-end');
			performance.measure('render.computeVisibilityTextureData', 'computeVisibilityTextureData-start', 'computeVisibilityTextureData-end');
		}

		return {
			data,
			offsets: visibleNodeTextureOffsets,
		};
	}

	public nodeIntersectsProfile(node: any, profile: any): boolean {
		const bbWorld = node.boundingBox.clone().applyMatrix4(this.matrixWorld);
		const bsWorld = bbWorld.getBoundingSphere(new THREE.Sphere());

		let intersects = false;
		for (let i = 0; i < profile.points.length - 1; i++) {
			const start = new THREE.Vector3(profile.points[i + 0].x, profile.points[i + 0].y, bsWorld.center.z);
			const end = new THREE.Vector3(profile.points[i + 1].x, profile.points[i + 1].y, bsWorld.center.z);

			const closest = new THREE.Line3(start, end).closestPointToPoint(bsWorld.center, true, new THREE.Vector3());
			const distance = closest.distanceTo(bsWorld.center);
			intersects = intersects || (distance < (bsWorld.radius + profile.width));
		}

		return intersects;
	}

	public deepestNodeAt(position: THREE.Vector3): PointCloudOctreeNode | null {
		const toObjectSpace = this.matrixWorld.clone().invert();
		const objPos = position.clone().applyMatrix4(toObjectSpace);

		let current: any = this.root;
		while (current) {
			let containingChild: any = null;

			for (const child of current.children) {
				if (child !== undefined && child.getBoundingBox().containsPoint(objPos)) {
					containingChild = child;
				}
			}

			if (containingChild !== null && containingChild instanceof PointCloudOctreeNode) {
				current = containingChild;
			} else {
				break;
			}
		}

		return current;
	}

	public nodesOnRay(nodes: any[], ray: THREE.Ray): any[] {
		const result: any[] = [];
		const _ray = ray.clone();

		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			const sphere = node.getBoundingSphere().clone().applyMatrix4(this.matrixWorld);
			if (_ray.intersectsSphere(sphere)) {
				result.push(node);
			}
		}

		return result;
	}

	public updateMatrixWorld(force?: boolean): void {
		if (this.matrixAutoUpdate) this.updateMatrix();

		if (this.matrixWorldNeedsUpdate || force) {
			if (!this.parent) {
				this.matrixWorld.copy(this.matrix);
			} else {
				this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
			}
			this.matrixWorldNeedsUpdate = false;
			force = true;
		}

		for (let i = 0; i < this.children.length; i++) {
			this.children[i].updateMatrixWorld(force);
		}
	}

	public hideDescendants(object: THREE.Object3D): void {
		const stack: THREE.Object3D[] = [];
		for (let i = 0; i < object.children.length; i++) {
			const child = object.children[i];
			if (child.visible) stack.push(child);
		}

		while (stack.length > 0) {
			const obj = stack.shift()!;
			obj.visible = false;
			for (let i = 0; i < obj.children.length; i++) {
				const child = obj.children[i];
				if (child.visible) stack.push(child);
			}
		}
	}

	public moveToOrigin(): void {
		this.position.set(0, 0, 0);
		this.updateMatrixWorld(true);
		const box = this.boundingBox;
		const transform = this.matrixWorld;
		const tBox = Utils.computeTransformedBoundingBox(box, transform);
		this.position.set(0, 0, 0).sub(tBox.getCenter(new THREE.Vector3()));
	}

	public moveToGroundPlane(): void {
		this.updateMatrixWorld(true);
		const box = this.boundingBox;
		const transform = this.matrixWorld;
		const tBox = Utils.computeTransformedBoundingBox(box, transform);
		this.position.y += -tBox.min.y;
	}

	public getBoundingBoxWorld(): THREE.Box3 {
		this.updateMatrixWorld(true);
		const box = this.boundingBox;
		const transform = this.matrixWorld;
		return Utils.computeTransformedBoundingBox(box, transform);
	}

	public getPointsInProfile(profile: any, maxDepth: number, callback?: (res: any) => void): any {
		if (callback) {
			const request = new ProfileRequest(this, profile, maxDepth, callback);
			this.profileRequests.push(request);
			return request;
		}

		const points: {
			segments: any[];
			boundingBox: THREE.Box3;
			projectedBoundingBox: THREE.Box2;
		} = {
			segments: [],
			boundingBox: new THREE.Box3(),
			projectedBoundingBox: new THREE.Box2(),
		};

		for (let i = 0; i < profile.points.length - 1; i++) {
			const start = profile.points[i];
			const end = profile.points[i + 1];
			const ps = (this as any).getProfile(start, end, profile.width, maxDepth);

			const segment = {
				start: start,
				end: end,
				points: ps,
				project: null as any,
			};

			points.segments.push(segment);
			if (ps?.boundingBox) {
				points.boundingBox.expandByPoint(ps.boundingBox.min);
				points.boundingBox.expandByPoint(ps.boundingBox.max);
			}
		}

		const mileage = new THREE.Vector3();
		for (let i = 0; i < points.segments.length; i++) {
			const segment = points.segments[i];
			const start = segment.start;
			const end = segment.end;

			const project = ((_start: THREE.Vector3, _end: THREE.Vector3, _mileage: THREE.Vector3, _boundingBox: THREE.Box3) => {
				const xAxis = new THREE.Vector3(1, 0, 0);
				const dir = new THREE.Vector3().subVectors(_end, _start);
				dir.y = 0;
				dir.normalize();
				let alpha = Math.acos(xAxis.dot(dir));
				if (dir.z > 0) alpha = -alpha;

				return (pos: THREE.Vector3) => {
					const toOrigin = new THREE.Matrix4().makeTranslation(-_start.x, -_boundingBox.min.y, -_start.z);
					const alignWithX = new THREE.Matrix4().makeRotationY(-alpha);
					const applyMileage = new THREE.Matrix4().makeTranslation(_mileage.x, 0, 0);

					const p = pos.clone();
					p.applyMatrix4(toOrigin);
					p.applyMatrix4(alignWithX);
					p.applyMatrix4(applyMileage);
					return p;
				};
			})(start, end, mileage.clone(), points.boundingBox.clone());

			segment.project = project;
			mileage.x += new THREE.Vector3(start.x, 0, start.z).distanceTo(new THREE.Vector3(end.x, 0, end.z));
			mileage.y += end.y - start.y;
		}

		points.projectedBoundingBox.min.x = 0;
		points.projectedBoundingBox.min.y = points.boundingBox.min.y;
		points.projectedBoundingBox.max.x = mileage.x;
		points.projectedBoundingBox.max.y = points.boundingBox.max.y;

		return points;
	}

	public getProfile(start: any, end: any, width: number, depth: number, callback?: (res: any) => void): any {
		const request = new (ProfileRequest as any)(start, end, width, depth, callback);
		this.profileRequests.push(request);
		return request;
	}

	public getVisibleExtent(): THREE.Box3 {
		return this.visibleBounds.clone().applyMatrix4(this.matrixWorld);
	}

	public intersectsPoint(position: THREE.Vector3): boolean {
		const rootAvailable = this.pcoGeometry.root && this.pcoGeometry.root.geometry;
		if (!rootAvailable) return false;

		if (!this.signedDistanceField) {
			const resolution = 32;
			const field = new Float32Array(Math.pow(resolution, 3)).fill(Infinity);
			const positions = this.pcoGeometry.root.geometry.attributes.position;
			const boundingBox = this.boundingBox;
			const n = positions.count;

			for (let i = 0; i < n; i += 3) {
				const x = positions.array[3 * i + 0];
				const y = positions.array[3 * i + 1];
				const z = positions.array[3 * i + 2];

				const ix = parseInt(String(Math.min(resolution * (x / boundingBox.max.x), resolution - 1)), 10);
				const iy = parseInt(String(Math.min(resolution * (y / boundingBox.max.y), resolution - 1)), 10);
				const iz = parseInt(String(Math.min(resolution * (z / boundingBox.max.z), resolution - 1)), 10);

				const index = ix + iy * resolution + iz * resolution * resolution;
				field[index] = 0;
			}

			this.signedDistanceField = { resolution, field };
		}

		const sdf = this.signedDistanceField;
		const boundingBox = this.boundingBox;
		const toObjectSpace = this.matrixWorld.clone().invert();
		const objPos = position.clone().applyMatrix4(toObjectSpace);
		const resolution = sdf.resolution;

		const ix = parseInt(String(resolution * (objPos.x / boundingBox.max.x)), 10);
		const iy = parseInt(String(resolution * (objPos.y / boundingBox.max.y)), 10);
		const iz = parseInt(String(resolution * (objPos.z / boundingBox.max.z)), 10);

		if (ix < 0 || iy < 0 || iz < 0) return false;
		if (ix >= resolution || iy >= resolution || iz >= resolution) return false;

		const index = ix + iy * resolution + iz * resolution * resolution;
		return sdf.field[index] === 0;
	}

	public pick(viewer: any, camera: any, ray: THREE.Ray, params: any = {}): any {
		const renderer = viewer.renderer;
		const pRenderer = viewer.pRenderer;
		performance.mark('pick-start');

		const getVal = (a: any, b: any) => a !== undefined ? a : b;
		const pickWindowSize = getVal(params.pickWindowSize, 65);
		const size = renderer.getSize(new THREE.Vector2());

		const width = Math.ceil(getVal(params.width, size.width));
		const height = Math.ceil(getVal(params.height, size.height));
		const pointSizeType = getVal(params.pointSizeType, this.material.pointSizeType);
		const pointSize = getVal(params.pointSize, this.material.size);

		const nodes = this.nodesOnRay(this.visibleNodes, ray);
		if (nodes.length === 0) return null;

		if (!this.pickState) {
			const scene = new THREE.Scene();
			const material = new PointCloudMaterial();
			material.activeAttributeName = 'indices';
			const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
			});

			this.pickState = { renderTarget, material, scene };
		}

		const pickState = this.pickState;
		const pickMaterial = pickState.material;

		pickMaterial.pointSizeType = pointSizeType;
		pickMaterial.shape = PointShape.PARABOLOID;
		pickMaterial.uniforms.uFilterReturnNumberRange.value = this.material.uniforms.uFilterReturnNumberRange.value;
		pickMaterial.uniforms.uFilterNumberOfReturnsRange.value = this.material.uniforms.uFilterNumberOfReturnsRange.value;
		pickMaterial.uniforms.uFilterGPSTimeClipRange.value = this.material.uniforms.uFilterGPSTimeClipRange.value;
		pickMaterial.uniforms.uFilterPointSourceIDClipRange.value = this.material.uniforms.uFilterPointSourceIDClipRange.value;
		pickMaterial.activeAttributeName = 'indices';
		pickMaterial.size = pointSize;
		pickMaterial.uniforms.minSize.value = this.material.uniforms.minSize.value;
		pickMaterial.uniforms.maxSize.value = this.material.uniforms.maxSize.value;
		pickMaterial.classification = this.material.classification;
		pickMaterial.recomputeClassification();

		if (params.pickClipped) {
			pickMaterial.clipBoxes = this.material.clipBoxes;
			pickMaterial.uniforms.clipBoxes = this.material.uniforms.clipBoxes;
			if (this.material.clipTask === ClipTask.HIGHLIGHT) {
				pickMaterial.clipTask = ClipTask.NONE;
			} else {
				pickMaterial.clipTask = this.material.clipTask;
			}
			pickMaterial.clipMethod = this.material.clipMethod;
		} else {
			pickMaterial.clipBoxes = [];
		}

		this.updateMaterial(pickMaterial, nodes, camera, renderer);
		pickState.renderTarget.setSize(width, height);

		const pixelPos = new THREE.Vector2(params.x, params.y);
		const gl = renderer.getContext();
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(
			parseInt(String(pixelPos.x - (pickWindowSize - 1) / 2), 10),
			parseInt(String(pixelPos.y - (pickWindowSize - 1) / 2), 10),
			parseInt(String(pickWindowSize), 10),
			parseInt(String(pickWindowSize), 10)
		);

		renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
		renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
		renderer.state.setBlending(THREE.NoBlending);

		renderer.setRenderTarget(pickState.renderTarget);
		gl.clearColor(0, 0, 0, 0);
		renderer.clear(true, true, true);

		const tmp = this.material;
		this.material = pickMaterial;
		pRenderer.renderOctree(this, nodes, camera, pickState.renderTarget);
		this.material = tmp;

		const clamp = (number: number, min: number, max: number) => Math.min(Math.max(min, number), max);
		const x = parseInt(String(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width)), 10);
		const y = parseInt(String(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height)), 10);
		const w = parseInt(String(Math.min(x + pickWindowSize, width) - x), 10);
		const h = parseInt(String(Math.min(y + pickWindowSize, height) - y), 10);

		const pixelCount = w * h;
		const buffer = new Uint8Array(4 * pixelCount);
		gl.readPixels(x, y, pickWindowSize, pickWindowSize, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

		renderer.setRenderTarget(null);
		renderer.state.reset();
		renderer.setScissorTest(false);
		gl.disable(gl.SCISSOR_TEST);

		const pixels = buffer;
		const ibuffer = new Uint32Array(buffer.buffer);
		const hits: any[] = [];

		for (let u = 0; u < pickWindowSize; u++) {
			for (let v = 0; v < pickWindowSize; v++) {
				const offset = (u + v * pickWindowSize);
				const distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

				const pcIndex = pixels[4 * offset + 3];
				pixels[4 * offset + 3] = 0;
				const pIndex = ibuffer[offset];

				if (!(pcIndex === 0 && pIndex === 0) && (pcIndex !== undefined) && (pIndex !== undefined)) {
					const hit = { pIndex, pcIndex, distanceToCenter: distance };
					if (params.all) {
						hits.push(hit);
					} else {
						if (hits.length > 0) {
							if (distance < hits[0].distanceToCenter) {
								hits[0] = hit;
							}
						} else {
							hits.push(hit);
						}
					}
				}
			}
		}

		for (const hit of hits) {
			const point: Record<string, any> = {};
			if (!nodes[hit.pcIndex]) return null;

			const node = nodes[hit.pcIndex];
			const pc = node.sceneNode;
			const geometry = node.geometryNode.geometry;

			for (const attributeName in geometry.attributes) {
				const attribute = geometry.attributes[attributeName];

				if (attributeName === 'position') {
					const px = attribute.array[3 * hit.pIndex + 0];
					const py = attribute.array[3 * hit.pIndex + 1];
					const pz = attribute.array[3 * hit.pIndex + 2];

					const position = new THREE.Vector3(px, py, pz);
					position.applyMatrix4(pc.matrixWorld);
					point[attributeName] = position;
				} else if (attributeName !== 'indices') {
					let values = attribute.array.slice(attribute.itemSize * hit.pIndex, attribute.itemSize * (hit.pIndex + 1));
					if (attribute.potree) {
						const { scale, offset } = attribute.potree;
						values = values.map((val: number) => val / scale + offset);
					}
					point[attributeName] = values;
				}
			}

			hit.point = point;
		}

		performance.mark('pick-end');
		performance.measure('pick', 'pick-start', 'pick-end');

		if (params.all) {
			return hits.map(hit => hit.point);
		} else {
			return hits.length === 0 ? null : hits[0].point;
		}
	}

	public * getFittedBoxGen(boxNode: THREE.Object3D): Generator<THREE.Object3D | void, void, unknown> {
		const shrinkedLocalBounds = new THREE.Box3();
		const worldToBox = boxNode.matrixWorld.clone().invert();

		for (const node of this.visibleNodes) {
			if (!node.sceneNode) continue;

			const buffer = node.geometryNode.buffer;
			const posOffset = buffer.offset('position');
			const stride = buffer.stride;
			const view = new DataView(buffer.data);
			const objectToBox = new THREE.Matrix4().multiplyMatrices(worldToBox, node.sceneNode.matrixWorld);

			const pos = new THREE.Vector4();
			for (let i = 0; i < buffer.numElements; i++) {
				const x = view.getFloat32(i * stride + posOffset + 0, true);
				const y = view.getFloat32(i * stride + posOffset + 4, true);
				const z = view.getFloat32(i * stride + posOffset + 8, true);

				pos.set(x, y, z, 1);
				pos.applyMatrix4(objectToBox);

				if (-0.5 < pos.x && pos.x < 0.5 && -0.5 < pos.y && pos.y < 0.5 && -0.5 < pos.z && pos.z < 0.5) {
					shrinkedLocalBounds.expandByPoint(pos as any);
				}
			}
			yield;
		}

		const fittedPosition = shrinkedLocalBounds.getCenter(new THREE.Vector3()).applyMatrix4(boxNode.matrixWorld);
		const fitted = new THREE.Object3D();
		fitted.position.copy(fittedPosition);
		fitted.scale.copy(boxNode.scale);
		fitted.rotation.copy(boxNode.rotation);

		const ds = new THREE.Vector3().subVectors(shrinkedLocalBounds.max, shrinkedLocalBounds.min);
		fitted.scale.multiply(ds);

		yield fitted;
	}

	public getFittedBox(boxNode: THREE.Object3D, maxLevel: number = Infinity): THREE.Object3D {
		const shrinkedLocalBounds = new THREE.Box3();
		const worldToBox = boxNode.matrixWorld.clone().invert();

		for (const node of this.visibleNodes) {
			if (!node.sceneNode || node.getLevel() > maxLevel) continue;

			const buffer = node.geometryNode.buffer;
			const posOffset = buffer.offset('position');
			const stride = buffer.stride;
			const view = new DataView(buffer.data);
			const objectToBox = new THREE.Matrix4().multiplyMatrices(worldToBox, node.sceneNode.matrixWorld);

			const pos = new THREE.Vector4();
			for (let i = 0; i < buffer.numElements; i++) {
				const x = view.getFloat32(i * stride + posOffset + 0, true);
				const y = view.getFloat32(i * stride + posOffset + 4, true);
				const z = view.getFloat32(i * stride + posOffset + 8, true);

				pos.set(x, y, z, 1);
				pos.applyMatrix4(objectToBox);

				if (-0.5 < pos.x && pos.x < 0.5 && -0.5 < pos.y && pos.y < 0.5 && -0.5 < pos.z && pos.z < 0.5) {
					shrinkedLocalBounds.expandByPoint(pos as any);
				}
			}
		}

		const fittedPosition = shrinkedLocalBounds.getCenter(new THREE.Vector3()).applyMatrix4(boxNode.matrixWorld);
		const fitted = new THREE.Object3D();
		fitted.position.copy(fittedPosition);
		fitted.scale.copy(boxNode.scale);
		fitted.rotation.copy(boxNode.rotation);

		const ds = new THREE.Vector3().subVectors(shrinkedLocalBounds.max, shrinkedLocalBounds.min);
		fitted.scale.multiply(ds);

		return fitted;
	}

	public get progress(): number {
		return this.visibleGeometry.length > 0 ? this.visibleNodes.length / this.visibleGeometry.length : 1;
	}

	public find(name: string): any {
		let node: any = null;
		for (const char of name) {
			if (char === 'r') {
				node = this.root;
			} else if (node && node.children) {
				node = node.children[char];
			}
		}
		return node;
	}
}
