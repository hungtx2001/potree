import * as THREE from 'three';
import { ClipTask, ClipMethod } from '../types.js';
import { Box3Helper } from '../utils/Box3Helper.js';
import { BinaryHeap } from '../utils/BinaryHeap.js';
import { runtime, lru } from '../runtime/runtime.js';

const pointcloudTransformVersion = new Map<any, { number: number; transform: THREE.Matrix4 }>();

// --- Camera-dirty visibility cache variables ---
const _cachedCameraMatrix = new THREE.Matrix4();
const _cachedProjectionMatrix = new THREE.Matrix4();
let _cachedPointBudget = 0;
let _cachedPointcloudCount = 0;
let _cachedResult: any = null;
export let visibilityDirty: boolean = true;

export function markVisibilityDirty(): void {
	visibilityDirty = true;
}

// Scratch objects for clipping boxes (zero GC)
let _cbPcWorldInv: THREE.Matrix4 | null = null;
let _cbPx: THREE.Vector3, _cbNx: THREE.Vector3;
let _cbPy: THREE.Vector3, _cbNy: THREE.Vector3;
let _cbPz: THREE.Vector3, _cbNz: THREE.Vector3;
let _cbPxN: THREE.Vector3, _cbNxN: THREE.Vector3;
let _cbPyN: THREE.Vector3, _cbNyN: THREE.Vector3;
let _cbPzN: THREE.Vector3, _cbNzN: THREE.Vector3;
let _cbPxPlane: THREE.Plane, _cbNxPlane: THREE.Plane;
let _cbPyPlane: THREE.Plane, _cbNyPlane: THREE.Plane;
let _cbPzPlane: THREE.Plane, _cbNzPlane: THREE.Plane;
let _cbFrustum: THREE.Frustum | null = null;

export function updatePointClouds(pointclouds: any[], camera: any, renderer: any): any {
	for (const pointcloud of pointclouds) {
		const start = performance.now();

		if (pointcloud.profileRequests) {
			for (const profileRequest of pointcloud.profileRequests) {
				profileRequest.update();

				const duration = performance.now() - start;
				if (duration > 5) {
					break;
				}
			}
		}
	}

	const result = updateVisibility(pointclouds, camera, renderer);

	for (const pointcloud of pointclouds) {
		pointcloud.updateMaterial(pointcloud.material, pointcloud.visibleNodes, camera, renderer);
		pointcloud.updateVisibleBounds();
	}

	lru.freeMemory();

	return result;
}

export function updateVisibilityStructures(pointclouds: any[], camera: any, _renderer?: any): any {
	const frustums: THREE.Frustum[] = [];
	const camObjPositions: THREE.Vector3[] = [];
	const priorityQueue = new BinaryHeap((x: any) => 1 / x.weight);

	for (let i = 0; i < pointclouds.length; i++) {
		const pointcloud = pointclouds[i];

		if (!pointcloud.initialized()) {
			continue;
		}

		pointcloud.numVisibleNodes = 0;
		pointcloud.numVisiblePoints = 0;
		pointcloud.deepestVisibleLevel = 0;
		pointcloud.visibleNodes = [];
		pointcloud.visibleGeometry = [];

		// frustum in object space
		camera.updateMatrixWorld();
		const frustum = new THREE.Frustum();
		const viewI = camera.matrixWorldInverse;
		const world = pointcloud.matrixWorld;

		// use close near plane for frustum intersection
		const frustumCam = camera.clone();
		frustumCam.near = Math.min(camera.near, 0.1);
		frustumCam.updateProjectionMatrix();
		const proj = camera.projectionMatrix;

		const fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
		frustum.setFromProjectionMatrix(fm);
		frustums.push(frustum);

		// camera position in object space
		const view = camera.matrixWorld;
		const worldI = world.clone().invert();
		const camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
		const camObjPos = new THREE.Vector3().setFromMatrixPosition(camMatrixObject);
		camObjPositions.push(camObjPos);

		if (pointcloud.visible && pointcloud.root !== null) {
			priorityQueue.push({ pointcloud: i, node: pointcloud.root, weight: Number.MAX_VALUE });
		}

		if (pointcloud.root.isTreeNode && pointcloud.root.isTreeNode()) {
			pointcloud.hideDescendants(pointcloud.root.sceneNode);
		}

		if (pointcloud.boundingBoxNodes) {
			for (let j = 0; j < pointcloud.boundingBoxNodes.length; j++) {
				pointcloud.boundingBoxNodes[j].visible = false;
			}
		}
	}

	return {
		frustums,
		camObjPositions,
		priorityQueue,
	};
}

export function updateVisibility(pointclouds: any[], camera: any, renderer: any): any {
	// --- Camera-dirty visibility cache ---
	const cameraChanged = !_cachedCameraMatrix.equals(camera.matrixWorldInverse)
		|| !_cachedProjectionMatrix.equals(camera.projectionMatrix);
	const configChanged = _cachedPointBudget !== runtime.pointBudget
		|| _cachedPointcloudCount !== pointclouds.length;

	if (!cameraChanged && !configChanged && !visibilityDirty && _cachedResult) {
		for (const node of _cachedResult.visibleNodes) {
			if (node.isTreeNode && node.isTreeNode()) {
				lru.touch(node.geometryNode);
			}
		}
		return _cachedResult;
	}

	let numVisiblePoints = 0;
	const numVisiblePointsInPointclouds = new Map<any, number>(pointclouds.map(pc => [pc, 0]));

	const visibleNodes: any[] = [];
	const visibleGeometry: any[] = [];
	const unloadedGeometry: any[] = [];
	let lowestSpacing = Infinity;

	const s = updateVisibilityStructures(pointclouds, camera, renderer);
	const frustums = s.frustums;
	const camObjPositions = s.camObjPositions;
	const priorityQueue = s.priorityQueue;

	let loadedToGPUThisFrame = 0;
	const uploadStartTime = performance.now();
	const domHeight = renderer.domElement.clientHeight;

	for (const pointcloud of pointclouds) {
		if (!pointcloud.visible) {
			continue;
		}

		pointcloud.updateMatrixWorld();

		if (!pointcloudTransformVersion.has(pointcloud)) {
			pointcloudTransformVersion.set(pointcloud, { number: 0, transform: pointcloud.matrixWorld.clone() });
		} else {
			const version = pointcloudTransformVersion.get(pointcloud)!;

			if (!version.transform.equals(pointcloud.matrixWorld)) {
				version.number++;
				version.transform.copy(pointcloud.matrixWorld);

				pointcloud.dispatchEvent({
					type: 'transformation_changed',
					target: pointcloud,
				});
			}
		}
	}

	while (priorityQueue.size() > 0) {
		const element = priorityQueue.pop();
		let node = element.node;
		const parent = element.parent;
		const pointcloud = pointclouds[element.pointcloud];

		const box = node.getBoundingBox();
		const frustum = frustums[element.pointcloud];
		const camObjPos = camObjPositions[element.pointcloud];

		const insideFrustum = frustum.intersectsBox(box);
		const maxLevel = pointcloud.maxLevel || Infinity;
		const level = node.getLevel();
		let visible = insideFrustum;
		visible = visible && !(numVisiblePoints + node.getNumPoints() > runtime.pointBudget);
		visible = visible && !(numVisiblePointsInPointclouds.get(pointcloud)! + node.getNumPoints() > pointcloud.pointBudget);
		visible = visible && level < maxLevel;
		visible = visible || node.getLevel() <= 2;

		const clipBoxes = pointcloud.material.clipBoxes;
		if (clipBoxes && clipBoxes.length > 0) {
			let numIntersecting = 0;
			const numIntersectionVolumes = clipBoxes.length;

			for (const clipBox of clipBoxes) {
				if (!_cbPcWorldInv) {
					_cbPcWorldInv = new THREE.Matrix4();
					_cbPx = new THREE.Vector3(); _cbNx = new THREE.Vector3();
					_cbPy = new THREE.Vector3(); _cbNy = new THREE.Vector3();
					_cbPz = new THREE.Vector3(); _cbNz = new THREE.Vector3();
					_cbPxN = new THREE.Vector3(); _cbNxN = new THREE.Vector3();
					_cbPyN = new THREE.Vector3(); _cbNyN = new THREE.Vector3();
					_cbPzN = new THREE.Vector3(); _cbNzN = new THREE.Vector3();
					_cbPxPlane = new THREE.Plane(); _cbNxPlane = new THREE.Plane();
					_cbPyPlane = new THREE.Plane(); _cbNyPlane = new THREE.Plane();
					_cbPzPlane = new THREE.Plane(); _cbNzPlane = new THREE.Plane();
					_cbFrustum = new THREE.Frustum();
				}

				_cbPcWorldInv.copy(pointcloud.matrixWorld).invert();
				_cbPx.set(+0.5, 0, 0).applyMatrix4(_cbPcWorldInv);
				_cbNx.set(-0.5, 0, 0).applyMatrix4(_cbPcWorldInv);
				_cbPy.set(0, +0.5, 0).applyMatrix4(_cbPcWorldInv);
				_cbNy.set(0, -0.5, 0).applyMatrix4(_cbPcWorldInv);
				_cbPz.set(0, 0, +0.5).applyMatrix4(_cbPcWorldInv);
				_cbNz.set(0, 0, -0.5).applyMatrix4(_cbPcWorldInv);

				_cbPxN.subVectors(_cbNx, _cbPx).normalize();
				_cbNxN.copy(_cbPxN).multiplyScalar(-1);
				_cbPyN.subVectors(_cbNy, _cbPy).normalize();
				_cbNyN.copy(_cbPyN).multiplyScalar(-1);
				_cbPzN.subVectors(_cbNz, _cbPz).normalize();
				_cbNzN.copy(_cbPzN).multiplyScalar(-1);

				_cbPxPlane.setFromNormalAndCoplanarPoint(_cbPxN, _cbPx);
				_cbNxPlane.setFromNormalAndCoplanarPoint(_cbNxN, _cbNx);
				_cbPyPlane.setFromNormalAndCoplanarPoint(_cbPyN, _cbPy);
				_cbNyPlane.setFromNormalAndCoplanarPoint(_cbNyN, _cbNy);
				_cbPzPlane.setFromNormalAndCoplanarPoint(_cbPzN, _cbPz);
				_cbNzPlane.setFromNormalAndCoplanarPoint(_cbNzN, _cbNz);

				_cbFrustum!.set(_cbPxPlane, _cbNxPlane, _cbPyPlane, _cbNyPlane, _cbPzPlane, _cbNzPlane);
				const intersects = _cbFrustum!.intersectsBox(box);

				if (intersects) {
					numIntersecting++;
				}
			}

			const insideAny = numIntersecting > 0;
			const insideAll = numIntersecting === numIntersectionVolumes;

			if (pointcloud.material.clipTask === ClipTask.SHOW_INSIDE) {
				if (pointcloud.material.clipMethod === ClipMethod.INSIDE_ANY && insideAny) {
					// visible
				} else if (pointcloud.material.clipMethod === ClipMethod.INSIDE_ALL && insideAll) {
					// visible
				} else {
					visible = false;
				}
			}
		}

		if (node.spacing) {
			lowestSpacing = Math.min(lowestSpacing, node.spacing);
		} else if (node.geometryNode && node.geometryNode.spacing) {
			lowestSpacing = Math.min(lowestSpacing, node.geometryNode.spacing);
		}

		if (numVisiblePoints + node.getNumPoints() > runtime.pointBudget) {
			break;
		}

		if (!visible) {
			continue;
		}

		numVisiblePoints += node.getNumPoints();
		const numVisiblePointsInPointcloud = numVisiblePointsInPointclouds.get(pointcloud)!;
		numVisiblePointsInPointclouds.set(pointcloud, numVisiblePointsInPointcloud + node.getNumPoints());

		pointcloud.numVisibleNodes++;
		pointcloud.numVisiblePoints += node.getNumPoints();

		if (node.isGeometryNode() && (!parent || parent.isTreeNode())) {
			const uploadBudgetMs = runtime.uploadBudgetMs || 5;
			if (node.isLoaded() && (performance.now() - uploadStartTime) < uploadBudgetMs) {
				node = pointcloud.toTreeNode(node, parent);
				loadedToGPUThisFrame++;
			} else {
				unloadedGeometry.push(node);
				visibleGeometry.push(node);
			}
		}

		if (node.isTreeNode()) {
			lru.touch(node.geometryNode);
			node.sceneNode.visible = true;
			node.sceneNode.material = pointcloud.material;

			visibleNodes.push(node);
			pointcloud.visibleNodes.push(node);

			if (node._transformVersion === undefined) {
				node._transformVersion = -1;
			}
			const transformVersion = pointcloudTransformVersion.get(pointcloud)!;
			if (node._transformVersion !== transformVersion.number) {
				node.sceneNode.updateMatrix();
				node.sceneNode.matrixWorld.multiplyMatrices(pointcloud.matrixWorld, node.sceneNode.matrix);
				node._transformVersion = transformVersion.number;
			}

			if (pointcloud.showBoundingBox && !node.boundingBoxNode && node.getBoundingBox) {
				const boxHelper = new Box3Helper(node.getBoundingBox());
				boxHelper.matrixAutoUpdate = false;
				pointcloud.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
			} else if (pointcloud.showBoundingBox) {
				node.boundingBoxNode.visible = true;
				node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
			} else if (!pointcloud.showBoundingBox && node.boundingBoxNode) {
				node.boundingBoxNode.visible = false;
			}
		}

		const children = node.getChildren();
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			let weight = 0;

			if (camera.isPerspectiveCamera) {
				const sphere = child.getBoundingSphere();
				const center = sphere.center;

				const dx = camObjPos.x - center.x;
				const dy = camObjPos.y - center.y;
				const dz = camObjPos.z - center.z;
				const dd = dx * dx + dy * dy + dz * dz;
				const distance = Math.sqrt(dd);
				const radius = sphere.radius;

				const fov = (camera.fov * Math.PI) / 180;
				const slope = Math.tan(fov / 2);
				const projFactor = (0.5 * domHeight) / (slope * distance);
				const screenPixelRadius = radius * projFactor;

				if (screenPixelRadius < pointcloud.minimumNodePixelSize) {
					continue;
				}

				weight = screenPixelRadius;
				if (distance - radius < 0) {
					weight = Number.MAX_VALUE;
				}
			} else {
				const bb = child.getBoundingBox();
				const diagonal = bb.max.clone().sub(bb.min).length();
				weight = diagonal;
			}

			priorityQueue.push({ pointcloud: element.pointcloud, node: child, parent: node, weight });
		}
	}

	// Update DEM if enabled
	const maxDEMLevel = 4;
	const candidates = pointclouds.filter(p => (p.generateDEM && p.dem && typeof p.dem.update === 'function'));
	for (const pointcloud of candidates) {
		const updatingNodes = pointcloud.visibleNodes.filter((n: any) => n.getLevel() <= maxDEMLevel);
		pointcloud.dem.update(updatingNodes);
	}

	for (let i = 0; i < Math.min(runtime.maxNodesLoading, unloadedGeometry.length); i++) {
		unloadedGeometry[i].load();
	}

	_cachedCameraMatrix.copy(camera.matrixWorldInverse);
	_cachedProjectionMatrix.copy(camera.projectionMatrix);
	_cachedPointBudget = runtime.pointBudget;
	_cachedPointcloudCount = pointclouds.length;
	visibilityDirty = false;

	_cachedResult = {
		visibleNodes,
		numVisiblePoints,
		lowestSpacing,
	};

	return _cachedResult;
}
