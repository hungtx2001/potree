
import * as THREE from 'three';
import {ClipTask, ClipMethod} from "./defines.js";
import {Box3Helper} from "./utils/Box3Helper.js";
import {BinaryHeap} from "./utils/BinaryHeap.js";
import {runtime, lru} from "./runtime.js";

const pointcloudTransformVersion = new Map();

// --- Camera-dirty visibility cache variables ---
const _cachedCameraMatrix = new THREE.Matrix4();
const _cachedProjectionMatrix = new THREE.Matrix4();
let _cachedPointBudget = 0;
let _cachedPointcloudCount = 0;
let _cachedResult = null;
export let visibilityDirty = true;

export function markVisibilityDirty() {
	visibilityDirty = true;
}

// Scratch objects for clipping boxes (zero GC)
let _cbPcWorldInv = null;
let _cbPx, _cbNx, _cbPy, _cbNy, _cbPz, _cbNz;
let _cbPxN, _cbNxN, _cbPyN, _cbNyN, _cbPzN, _cbNzN;
let _cbPxPlane, _cbNxPlane, _cbPyPlane, _cbNyPlane, _cbPzPlane, _cbNzPlane;
let _cbFrustum = null;

export function updatePointClouds(pointclouds, camera, renderer){

	for (let pointcloud of pointclouds) {
		let start = performance.now();

		for (let profileRequest of pointcloud.profileRequests) {
			profileRequest.update();

			let duration = performance.now() - start;
			if(duration > 5){
				break;
			}
		}

		let duration = performance.now() - start;
	}

	let result = updateVisibility(pointclouds, camera, renderer);

	for (let pointcloud of pointclouds) {
		pointcloud.updateMaterial(pointcloud.material, pointcloud.visibleNodes, camera, renderer);
		pointcloud.updateVisibleBounds();
	}

	lru.freeMemory();

	return result;
};



export function updateVisibilityStructures(pointclouds, camera, renderer) {
	let frustums = [];
	let camObjPositions = [];
	let priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

	for (let i = 0; i < pointclouds.length; i++) {
		let pointcloud = pointclouds[i];

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
		let frustum = new THREE.Frustum();
		let viewI = camera.matrixWorldInverse;
		let world = pointcloud.matrixWorld;
		
		// use close near plane for frustum intersection
		let frustumCam = camera.clone();
		frustumCam.near = Math.min(camera.near, 0.1);
		frustumCam.updateProjectionMatrix();
		let proj = camera.projectionMatrix;

		let fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
		frustum.setFromProjectionMatrix(fm);
		frustums.push(frustum);

		// camera position in object space
		let view = camera.matrixWorld;
		let worldI = world.clone().invert();
		let camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
		let camObjPos = new THREE.Vector3().setFromMatrixPosition(camMatrixObject);
		camObjPositions.push(camObjPos);

		if (pointcloud.visible && pointcloud.root !== null) {
			priorityQueue.push({pointcloud: i, node: pointcloud.root, weight: Number.MAX_VALUE});
		}

		// hide all previously visible nodes
		// if(pointcloud.root instanceof PointCloudOctreeNode){
		//	pointcloud.hideDescendants(pointcloud.root.sceneNode);
		// }
		if (pointcloud.root.isTreeNode()) {
			pointcloud.hideDescendants(pointcloud.root.sceneNode);
		}

		for (let j = 0; j < pointcloud.boundingBoxNodes.length; j++) {
			pointcloud.boundingBoxNodes[j].visible = false;
		}
	}

	return {
		'frustums': frustums,
		'camObjPositions': camObjPositions,
		'priorityQueue': priorityQueue
	};
};


export function updateVisibility(pointclouds, camera, renderer){

	// --- Camera-dirty visibility cache ---
	// Skip full octree traversal if camera hasn't moved and no new point cloud loaded
	const cameraChanged = !_cachedCameraMatrix.equals(camera.matrixWorldInverse)
		|| !_cachedProjectionMatrix.equals(camera.projectionMatrix);
	const configChanged = _cachedPointBudget !== runtime.pointBudget
		|| _cachedPointcloudCount !== pointclouds.length;

	if (!cameraChanged && !configChanged && !visibilityDirty && _cachedResult) {
		for (let node of _cachedResult.visibleNodes) {
			if (node.isTreeNode && node.isTreeNode()) {
				lru.touch(node.geometryNode);
			}
		}
		return _cachedResult;
	}

	let numVisibleNodes = 0;
	let numVisiblePoints = 0;

	let numVisiblePointsInPointclouds = new Map(pointclouds.map(pc => [pc, 0]));

	let visibleNodes = [];
	let visibleGeometry = [];
	let unloadedGeometry = [];

	let lowestSpacing = Infinity;

	// calculate object space frustum and cam pos and setup priority queue
	let s = updateVisibilityStructures(pointclouds, camera, renderer);
	let frustums = s.frustums;
	let camObjPositions = s.camObjPositions;
	let priorityQueue = s.priorityQueue;

	let loadedToGPUThisFrame = 0;
	let uploadStartTime = performance.now();
	
	let domWidth = renderer.domElement.clientWidth;
	let domHeight = renderer.domElement.clientHeight;

	// check if pointcloud has been transformed
	// some code will only be executed if changes have been detected
	for(let pointcloud of pointclouds){

		if(!pointcloud.visible){
			continue;
		}

		pointcloud.updateMatrixWorld();

		if(!pointcloudTransformVersion.has(pointcloud)){
			pointcloudTransformVersion.set(pointcloud, {number: 0, transform: pointcloud.matrixWorld.clone()});
		}else{
			let version = pointcloudTransformVersion.get(pointcloud);

			if(!version.transform.equals(pointcloud.matrixWorld)){
				version.number++;
				version.transform.copy(pointcloud.matrixWorld);

				pointcloud.dispatchEvent({
					type: "transformation_changed",
					target: pointcloud
				});
			}
		}
	}

	while (priorityQueue.size() > 0) {
		let element = priorityQueue.pop();
		let node = element.node;
		let parent = element.parent;
		let pointcloud = pointclouds[element.pointcloud];

		// { // restrict to certain nodes for debugging
		//	let allowedNodes = ["r", "r0", "r4"];
		//	if(!allowedNodes.includes(node.name)){
		//		continue;
		//	}
		// }

		let box = node.getBoundingBox();
		let frustum = frustums[element.pointcloud];
		let camObjPos = camObjPositions[element.pointcloud];

		let insideFrustum = frustum.intersectsBox(box);
		let maxLevel = pointcloud.maxLevel || Infinity;
		let level = node.getLevel();
		let visible = insideFrustum;
		visible = visible && !(numVisiblePoints + node.getNumPoints() > runtime.pointBudget);
		visible = visible && !(numVisiblePointsInPointclouds.get(pointcloud) + node.getNumPoints() > pointcloud.pointBudget);
		visible = visible && level < maxLevel;
		visible = visible || node.getLevel() <= 2;

		let clipBoxes = pointcloud.material.clipBoxes;
		if(true && clipBoxes.length > 0){

			//node.debug = false;

			let numIntersecting = 0;
			let numIntersectionVolumes = 0;

			//if(node.name === "r60"){
			//	var a = 10;
			//}

			for(let clipBox of clipBoxes){

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

				_cbFrustum.set(_cbPxPlane, _cbNxPlane, _cbPyPlane, _cbNyPlane, _cbPzPlane, _cbNzPlane);
				let intersects = _cbFrustum.intersectsBox(box);

				if(intersects){
					numIntersecting++;
				}
				numIntersectionVolumes++;
			}

			let insideAny = numIntersecting > 0;
			let insideAll = numIntersecting === numIntersectionVolumes;

			if(pointcloud.material.clipTask === ClipTask.SHOW_INSIDE){
				if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ANY && insideAny){
					//node.debug = true
				}else if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ALL && insideAll){
					//node.debug = true;
				}else{
					visible = false;
				}
			} else if(pointcloud.material.clipTask === ClipTask.SHOW_OUTSIDE){
				//if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ANY && !insideAny){
				//	//visible = true;
				//	let a = 10;
				//}else if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ALL && !insideAll){
				//	//visible = true;
				//	let a = 20;
				//}else{
				//	visible = false;
				//}
			}
			

		}

		// visible = ["r", "r0", "r06", "r060"].includes(node.name);
		// visible = ["r"].includes(node.name);

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

		// TODO: not used, same as the declaration?
		// numVisibleNodes++;
		numVisiblePoints += node.getNumPoints();
		let numVisiblePointsInPointcloud = numVisiblePointsInPointclouds.get(pointcloud);
		numVisiblePointsInPointclouds.set(pointcloud, numVisiblePointsInPointcloud + node.getNumPoints());

		pointcloud.numVisibleNodes++;
		pointcloud.numVisiblePoints += node.getNumPoints();

		if (node.isGeometryNode() && (!parent || parent.isTreeNode())) {
			let uploadBudgetMs = runtime.uploadBudgetMs || 5;
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

			if(node._transformVersion === undefined){
				node._transformVersion = -1;
			}
			let transformVersion = pointcloudTransformVersion.get(pointcloud);
			if(node._transformVersion !== transformVersion.number){
				node.sceneNode.updateMatrix();
				node.sceneNode.matrixWorld.multiplyMatrices(pointcloud.matrixWorld, node.sceneNode.matrix);	
				node._transformVersion = transformVersion.number;
			}

			if (pointcloud.showBoundingBox && !node.boundingBoxNode && node.getBoundingBox) {
				let boxHelper = new Box3Helper(node.getBoundingBox());
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

			// if(node.boundingBoxNode !== undefined && exports.debug.allowedNodes !== undefined){
			// 	if(!exports.debug.allowedNodes.includes(node.name)){
			// 		node.boundingBoxNode.visible = false;
			// 	}
			// }
		}

		// add child nodes to priorityQueue
		let children = node.getChildren();
		for (let i = 0; i < children.length; i++) {
			let child = children[i];

			let weight = 0; 
			if(camera.isPerspectiveCamera){
				let sphere = child.getBoundingSphere();
				let center = sphere.center;
				//let distance = sphere.center.distanceTo(camObjPos);
				
				let dx = camObjPos.x - center.x;
				let dy = camObjPos.y - center.y;
				let dz = camObjPos.z - center.z;
				
				let dd = dx * dx + dy * dy + dz * dz;
				let distance = Math.sqrt(dd);
				
				
				let radius = sphere.radius;
				
				let fov = (camera.fov * Math.PI) / 180;
				let slope = Math.tan(fov / 2);
				let projFactor = (0.5 * domHeight) / (slope * distance);
				let screenPixelRadius = radius * projFactor;
				
				if(screenPixelRadius < pointcloud.minimumNodePixelSize){
					continue;
				}
			
				weight = screenPixelRadius;

				if(distance - radius < 0){
					weight = Number.MAX_VALUE;
				}
			} else {
				// TODO ortho visibility
				let bb = child.getBoundingBox();				
				let distance = child.getBoundingSphere().center.distanceTo(camObjPos);
				let diagonal = bb.max.clone().sub(bb.min).length();
				//weight = diagonal / distance;

				weight = diagonal;
			}

			priorityQueue.push({pointcloud: element.pointcloud, node: child, parent: node, weight: weight});
		}
	}// end priority queue loop

	{ // update DEM
		let maxDEMLevel = 4;
		let candidates = pointclouds
			.filter(p => (p.generateDEM && p.dem && typeof p.dem.update === 'function'));
		for (let pointcloud of candidates) {
			let updatingNodes = pointcloud.visibleNodes.filter(n => n.getLevel() <= maxDEMLevel);
			pointcloud.dem.update(updatingNodes);
		}
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
		visibleNodes: visibleNodes,
		numVisiblePoints: numVisiblePoints,
		lowestSpacing: lowestSpacing
	};

	return _cachedResult;
};

