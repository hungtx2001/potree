import * as THREE from 'three';
import { PointCloudTree, PointCloudTreeNode } from '../octree/PointCloudTree.js';
import { PointCloudMaterial } from '../materials/PointCloudMaterial.js';
import { PointSizeType, ClipTask, TreeType } from '../types.js';
import { Utils } from '../utils/Utils.js';
import { runtime } from '../runtime/runtime.js';
import { PointCloudArena4DGeometry, PointCloudArena4DGeometryNode } from './PointCloudArena4DGeometry.js';

export class PointCloudArena4DNode extends PointCloudTreeNode {
	left: PointCloudArena4DNode | PointCloudArena4DGeometryNode | null = null;
	right: PointCloudArena4DNode | PointCloudArena4DGeometryNode | null = null;
	sceneNode: THREE.Points | null = null;
	kdtree: PointCloudArena4D | null = null;
	declare geometryNode: PointCloudArena4DGeometryNode;
	parent: PointCloudArena4DNode | null = null;
	pointcloud: PointCloudArena4D | null = null;
	pcIndex?: number;

	constructor() {
		super();
	}

	getNumPoints(): number {
		return this.geometryNode.numPoints;
	}

	isLoaded(): boolean {
		return true;
	}

	isTreeNode(): boolean {
		return true;
	}

	isGeometryNode(): boolean {
		return false;
	}

	getLevel(): number {
		return this.geometryNode.level;
	}

	getBoundingSphere(): THREE.Sphere {
		return this.geometryNode.boundingSphere;
	}

	getBoundingBox(): THREE.Box3 {
		return this.geometryNode.boundingBox;
	}

	toTreeNode(child: PointCloudArena4DGeometryNode): PointCloudArena4DNode | undefined {
		let geometryNode: PointCloudArena4DGeometryNode | null = null;

		if (this.left === child) {
			geometryNode = this.left as PointCloudArena4DGeometryNode;
		} else if (this.right === child) {
			geometryNode = this.right as PointCloudArena4DGeometryNode;
		}

		if (!geometryNode || !geometryNode.loaded || !this.kdtree) {
			return;
		}

		const node = new PointCloudArena4DNode();
		const sceneNode = new THREE.Points(geometryNode.geometry!, this.kdtree.material as any);
		sceneNode.visible = false;

		node.kdtree = this.kdtree;
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.parent = this;
		node.left = this.geometryNode.left;
		node.right = this.geometryNode.right;

		return node;
	}

	getChildren(): Array<PointCloudArena4DNode | PointCloudArena4DGeometryNode> {
		const children: Array<PointCloudArena4DNode | PointCloudArena4DGeometryNode> = [];
		if (this.left) children.push(this.left);
		if (this.right) children.push(this.right);
		return children;
	}
}

export class PointCloudArena4D extends PointCloudTree {
	root: PointCloudArena4DNode | PointCloudArena4DGeometryNode | null = null;
	visiblePointsTarget: number = 2 * 1000 * 1000;
	minimumNodePixelSize: number = 150;
	numVisibleNodes: number = 0;
	numVisiblePoints: number = 0;
	boundingBoxNodes: any[] = [];
	loadQueue: any[] = [];
	visibleNodes: PointCloudArena4DNode[] = [];
	pcoGeometry: PointCloudArena4DGeometry;
	boundingBox: THREE.Box3;
	boundingSphere: THREE.Sphere;
	material: PointCloudMaterial;
	profileRequests: any[] = [];
	name: string = '';
	maxLevel: number = 0;
	visibleNodeTextureOffsets: Map<PointCloudArena4DNode, number> | null = null;
	pickState: {
		renderTarget: THREE.WebGLRenderTarget;
		material: PointCloudMaterial;
		scene: THREE.Scene;
	} | null = null;

	constructor(geometry: PointCloudArena4DGeometry) {
		super();

		if (geometry.root) {
			this.root = geometry.root;
		} else {
			geometry.addEventListener('hierarchy_loaded', () => {
				this.root = geometry.root;
			});
		}

		this.position.sub(geometry.offset);
		this.updateMatrix();

		this.pcoGeometry = geometry;
		this.boundingBox = this.pcoGeometry.boundingBox;
		this.boundingSphere = this.pcoGeometry.boundingSphere;
		this.material = new PointCloudMaterial({ size: 0.05, treeType: TreeType.KDTREE });
		this.material.pointSizeType = PointSizeType.ATTENUATED;
		this.material.size = 0.05;
	}

	getBoundingBoxWorld(): THREE.Box3 {
		this.updateMatrixWorld(true);
		const box = this.boundingBox;
		const transform = this.matrixWorld;
		return Utils.computeTransformedBoundingBox(box, transform);
	}

	setName(name: string): void {
		if (this.name !== name) {
			this.name = name;
			this.dispatchEvent({ type: 'name_changed', name: name, pointcloud: this });
		}
	}

	getName(): string {
		return this.name;
	}

	getLevel(): number {
		return 0;
	}

	toTreeNode(geometryNode: PointCloudArena4DGeometryNode, parent?: PointCloudArena4DNode | null): PointCloudArena4DNode {
		const node = new PointCloudArena4DNode();
		const sceneNode = new THREE.Points(geometryNode.geometry!, this.material as any);

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
		node.kdtree = this;
		node.left = geometryNode.left;
		node.right = geometryNode.right;

		if (!parent) {
			this.root = node;
			this.add(sceneNode);
		} else {
			parent.sceneNode?.add(sceneNode);

			if (parent.left === geometryNode) {
				parent.left = node;
			} else if (parent.right === geometryNode) {
				parent.right = node;
			}
		}

		const disposeListener = () => {
			if (parent && parent.sceneNode && node.sceneNode) {
				parent.sceneNode.remove(node.sceneNode);
			}

			if (parent) {
				if (parent.left === node) {
					parent.left = geometryNode;
				} else if (parent.right === node) {
					parent.right = geometryNode;
				}
			}
		};
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);

		return node;
	}

	updateMaterial(material: PointCloudMaterial, visibleNodes: PointCloudArena4DNode[], camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
		if ((camera as THREE.PerspectiveCamera).fov) {
			material.fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
		}
		material.screenWidth = renderer.domElement.clientWidth;
		material.screenHeight = renderer.domElement.clientHeight;
		material.spacing = this.pcoGeometry.spacing || 1.0;
		material.near = (camera as THREE.PerspectiveCamera).near;
		material.far = (camera as THREE.PerspectiveCamera).far;

		if (this.maxLevel > (material as any).levels) {
			(material as any).levels = this.maxLevel + 2;
		}

		const bbSize = this.boundingBox.getSize(new THREE.Vector3());
		(material as any).bbSize = [bbSize.x, bbSize.y, bbSize.z];
	}

	updateVisibleBounds(): void {}

	hideDescendants(object: THREE.Object3D): void {
		const stack: THREE.Object3D[] = [];
		for (let i = 0; i < object.children.length; i++) {
			const child = object.children[i];
			if (child.visible) {
				stack.push(child);
			}
		}

		while (stack.length > 0) {
			const child = stack.shift()!;
			child.visible = false;
			if ((child as any).boundingBoxNode) {
				(child as any).boundingBoxNode.visible = false;
			}

			for (let i = 0; i < child.children.length; i++) {
				const childOfChild = child.children[i];
				if (childOfChild.visible) {
					stack.push(childOfChild);
				}
			}
		}
	}

	override updateMatrixWorld(force?: boolean): void {
		if (this.matrixAutoUpdate) this.updateMatrix();

		if (this.matrixWorldNeedsUpdate || force) {
			if (this.parent === null || this.parent === undefined) {
				this.matrixWorld.copy(this.matrix);
			} else {
				this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
			}

			this.matrixWorldNeedsUpdate = false;
			force = true;
		}
	}

	nodesOnRay(nodes: PointCloudArena4DNode[], ray: THREE.Ray): PointCloudArena4DNode[] {
		const result: PointCloudArena4DNode[] = [];
		const _ray = ray.clone();
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (!node.sceneNode) continue;
			const sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);

			if (_ray.intersectsSphere(sphere)) {
				result.push(node);
			}
		}
		return result;
	}

	pick(viewer: any, camera: THREE.Camera, ray: THREE.Ray, params: any = {}): any {
		const renderer: THREE.WebGLRenderer = viewer.renderer;
		const pRenderer = viewer.pRenderer;

		performance.mark('pick-start');
		const getVal = (a: any, b: any) => (a !== undefined ? a : b);

		const pickWindowSize = getVal(params.pickWindowSize, 17);
		const size = renderer.getSize(new THREE.Vector2());

		const width = Math.ceil(getVal(params.width, size.width));
		const height = Math.ceil(getVal(params.height, size.height));

		const pointSizeType = getVal(params.pointSizeType, this.material.pointSizeType);
		const pointSize = getVal(params.pointSize, this.material.size);

		const nodes = this.nodesOnRay(this.visibleNodes, ray);
		if (nodes.length === 0) {
			return null;
		}

		if (!this.pickState) {
			const scene = new THREE.Scene();
			const material = new PointCloudMaterial();
			material.activeAttributeName = 'indices';

			const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat
			});

			this.pickState = { renderTarget, material, scene };
		}

		const pickState = this.pickState;
		const pickMaterial = pickState.material;

		pickMaterial.pointSizeType = pointSizeType;
		pickMaterial.shape = this.material.shape;
		pickMaterial.size = pointSize;
		pickMaterial.uniforms.minSize.value = this.material.uniforms.minSize.value;
		pickMaterial.uniforms.maxSize.value = this.material.uniforms.maxSize.value;
		pickMaterial.classification = this.material.classification;
		if (params.pickClipped) {
			pickMaterial.clipBoxes = this.material.clipBoxes;
			if (this.material.clipTask === ClipTask.HIGHLIGHT) {
				pickMaterial.clipTask = ClipTask.NONE;
			} else {
				pickMaterial.clipTask = this.material.clipTask;
			}
		} else {
			pickMaterial.clipBoxes = [];
		}

		this.updateMaterial(pickMaterial, nodes, camera, renderer);
		pickState.renderTarget.setSize(width, height);

		const pixelPos = new THREE.Vector2(params.x, params.y);
		const gl = renderer.getContext() as WebGLRenderingContext;
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(
			Math.floor(pixelPos.x - (pickWindowSize - 1) / 2),
			Math.floor(pixelPos.y - (pickWindowSize - 1) / 2),
			pickWindowSize,
			pickWindowSize
		);

		renderer.setRenderTarget(pickState.renderTarget);
		gl.clearColor(0, 0, 0, 0);
		renderer.clearTarget(pickState.renderTarget, true, true, true);

		const tmp = this.material;
		this.material = pickMaterial;
		if (pRenderer && pRenderer.renderOctree) {
			pRenderer.renderOctree(this, nodes, camera, pickState.renderTarget);
		}
		this.material = tmp;

		const clamp = (number: number, min: number, max: number) => Math.min(Math.max(min, number), max);
		const x = Math.floor(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width));
		const y = Math.floor(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height));
		const w = Math.floor(Math.min(x + pickWindowSize, width) - x);
		const h = Math.floor(Math.min(y + pickWindowSize, height) - y);

		const pixelCount = w * h;
		const buffer = new Uint8Array(4 * pixelCount);
		gl.readPixels(x, y, pickWindowSize, pickWindowSize, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

		renderer.setRenderTarget(null);
		renderer.state.reset();
		gl.disable(gl.SCISSOR_TEST);

		const pixels = buffer;
		const ibuffer = new Uint32Array(buffer.buffer);
		const hits: any[] = [];

		for (let u = 0; u < pickWindowSize; u++) {
			for (let v = 0; v < pickWindowSize; v++) {
				const offset = u + v * pickWindowSize;
				const distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

				const pcIndex = pixels[4 * offset + 3];
				pixels[4 * offset + 3] = 0;
				const pIndex = ibuffer[offset];

				if (!(pcIndex === 0 && pIndex === 0) && pcIndex !== undefined && pIndex !== undefined) {
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
			if (!nodes[hit.pcIndex]) {
				return null;
			}

			const node = nodes[hit.pcIndex];
			const pc = node.sceneNode!;
			const geometry = node.geometryNode.geometry!;

			for (const attributeName in geometry.attributes) {
				const attribute = geometry.attributes[attributeName];
				if (attributeName === 'position') {
					const px = attribute.array[3 * hit.pIndex + 0];
					const py = attribute.array[3 * hit.pIndex + 1];
					const pz = attribute.array[3 * hit.pIndex + 2];
					const position = new THREE.Vector3(px, py, pz).applyMatrix4(pc.matrixWorld);
					point[attributeName] = position;
				}
			}
			hit.point = point;
		}

		performance.mark('pick-end');
		performance.measure('pick', 'pick-start', 'pick-end');

		if (params.all) {
			return hits.map((hit) => hit.point);
		} else {
			return hits.length === 0 ? null : hits[0].point;
		}
	}

	computeVisibilityTextureData(nodes: PointCloudArena4DNode[]): {
		data: Uint8Array;
		offsets: Map<PointCloudArena4DNode, number>;
	} {
		if ((runtime as any).measureTimings) performance.mark('computeVisibilityTextureData-start');

		const data = new Uint8Array(nodes.length * 3);
		const visibleNodeTextureOffsets = new Map<PointCloudArena4DNode, number>();
		nodes = nodes.slice();

		nodes.sort((a, b) => {
			const la = a.geometryNode.level;
			const lb = b.geometryNode.level;
			const na = a.geometryNode.number;
			const nb = b.geometryNode.number;
			if (la !== lb) return la - lb;
			return na - nb;
		});

		const visibleNodeNames = nodes.map((n) => n.geometryNode.number);

		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			visibleNodeTextureOffsets.set(node, i);

			let b1 = 0;
			let b2 = 0;
			let b3 = 0;

			if (node.geometryNode.left && visibleNodeNames.indexOf(node.geometryNode.left.number) > 0) {
				b1 += 1;
				b2 = visibleNodeNames.indexOf(node.geometryNode.left.number) - i;
			}
			if (node.geometryNode.right && visibleNodeNames.indexOf(node.geometryNode.right.number) > 0) {
				b1 += 2;
				b2 = b2 === 0 ? visibleNodeNames.indexOf(node.geometryNode.right.number) - i : b2;
			}

			if (node.geometryNode.split === 'X') {
				b3 = 1;
			} else if (node.geometryNode.split === 'Y') {
				b3 = 2;
			} else if (node.geometryNode.split === 'Z') {
				b3 = 4;
			}

			data[i * 3 + 0] = b1;
			data[i * 3 + 1] = b2;
			data[i * 3 + 2] = b3;
		}

		if ((runtime as any).measureTimings) {
			performance.mark('computeVisibilityTextureData-end');
			performance.measure('render.computeVisibilityTextureData', 'computeVisibilityTextureData-start', 'computeVisibilityTextureData-end');
		}

		return { data, offsets: visibleNodeTextureOffsets };
	}

	get progress(): number {
		if (this.pcoGeometry.root) {
			return runtime.numNodesLoading > 0 ? 0 : 1;
		}
		return 0;
	}
}
