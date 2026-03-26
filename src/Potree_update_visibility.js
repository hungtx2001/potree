import * as THREE from "../libs/three.js/build/three.module.js";
import {ClipMethod, ClipTask} from "./defines.js";
import {Box3Helper} from "./utils/Box3Helper.js";

// --- Visibility cache state ---
let _cachedCameraMatrix = new THREE.Matrix4();
let _cachedProjectionMatrix = new THREE.Matrix4();
let _cachedPointBudget = -1;
let _cachedPointcloudCount = -1;
let _cachedResult = null;

// Dirty flag — must be set to true when new nodes finish loading
// or when pointclouds are added/removed.
export let visibilityDirty = true;
export function setVisibilityDirty() { visibilityDirty = true; }

// --- Pre-allocated objects for clip box intersection (avoids ~1100 allocs/frame) ---
let _cbPcWorldInv = null;
let _cbPx, _cbNx, _cbPy, _cbNy, _cbPz, _cbNz;
let _cbPxN, _cbNxN, _cbPyN, _cbNyN, _cbPzN, _cbNzN;
let _cbPxPlane, _cbNxPlane, _cbPyPlane, _cbNyPlane, _cbPzPlane, _cbNzPlane;
let _cbFrustum;

export function updatePointClouds(pointclouds, camera, renderer) {

  for ( let pointcloud of pointclouds ) {
    let start = performance.now();

    for ( let profileRequest of pointcloud.profileRequests ) {
      profileRequest.update();

      let duration = performance.now() - start;
      if ( duration > 5 ) {
        break;
      }
    }

    let duration = performance.now() - start;
  }

  let result = updateVisibility(pointclouds, camera, renderer);

  for ( let pointcloud of pointclouds ) {
    pointcloud.updateMaterial(pointcloud.material, pointcloud.visibleNodes, camera, renderer);
    pointcloud.updateVisibleBounds();
  }

  exports.lru.freeMemory();

  return result;
}


// --- Pre-allocated objects to avoid GC pressure in updateVisibilityStructures ---
let _frustum = new THREE.Frustum();
let _fm = new THREE.Matrix4();
let _worldI = new THREE.Matrix4();
let _camMatrixObject = new THREE.Matrix4();
let _camObjPos = new THREE.Vector3();

export function updateVisibilityStructures(pointclouds, camera, renderer) {
  let frustums = [];
  let camObjPositions = [];
  let priorityQueue = new BinaryHeap(function (x) {
    return 1 / x.weight;
  });

  for ( let i = 0; i < pointclouds.length; i++ ) {
    let pointcloud = pointclouds[i];

    if ( !pointcloud.initialized() ) {
      continue;
    }

    pointcloud.numVisibleNodes = 0;
    pointcloud.numVisiblePoints = 0;
    pointcloud.deepestVisibleLevel = 0;
    pointcloud.visibleNodes = [];
    pointcloud.visibleGeometry = [];

    // frustum in object space — reuse pre-allocated objects
    camera.updateMatrixWorld();
    let viewI = camera.matrixWorldInverse;
    let world = pointcloud.matrixWorld;
    let proj = camera.projectionMatrix;

    _fm.identity().multiply(proj).multiply(viewI).multiply(world);
    _frustum.setFromProjectionMatrix(_fm);
    // Must clone for storage since we reuse _frustum
    let frustum = _frustum.clone();
    frustums.push(frustum);

    // camera position in object space — reuse pre-allocated objects
    _worldI.copy(world).invert();
    _camMatrixObject.identity().multiply(_worldI).multiply(camera.matrixWorld);
    _camObjPos.setFromMatrixPosition(_camMatrixObject);
    camObjPositions.push(_camObjPos.clone());

    if ( pointcloud.visible && pointcloud.root !== null ) {
      priorityQueue.push({pointcloud: i, node: pointcloud.root, weight: Number.MAX_VALUE});
    }

    // hide all previously visible nodes
    // if(pointcloud.root instanceof PointCloudOctreeNode){
    //	pointcloud.hideDescendants(pointcloud.root.sceneNode);
    // }
    if ( pointcloud.root.isTreeNode() ) {
      pointcloud.hideDescendants(pointcloud.root.sceneNode);
    }

    for ( let j = 0; j < pointcloud.boundingBoxNodes.length; j++ ) {
      pointcloud.boundingBoxNodes[j].visible = false;
    }
  }

  return {
    'frustums': frustums,
    'camObjPositions': camObjPositions,
    'priorityQueue': priorityQueue
  };
}


export function updateVisibility(pointclouds, camera, renderer) {

  // --- Camera-dirty visibility cache ---
  // Skip full octree traversal if camera hasn't moved and no new data loaded.
  let cameraChanged = !_cachedCameraMatrix.equals(camera.matrixWorldInverse)
    || !_cachedProjectionMatrix.equals(camera.projectionMatrix);
  let configChanged = _cachedPointBudget !== Potree.pointBudget
    || _cachedPointcloudCount !== pointclouds.length;

  if (!cameraChanged && !configChanged && !visibilityDirty && _cachedResult) {
    // Re-touch LRU for cached visible nodes to keep them alive
    for (let node of _cachedResult.visibleNodes) {
      if (node.isTreeNode && node.isTreeNode()) {
        exports.lru.touch(node.geometryNode);
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
  if ( !Potree._pointcloudTransformVersion ) {
    Potree._pointcloudTransformVersion = new Map();
  }
  let pointcloudTransformVersion = Potree._pointcloudTransformVersion;
  for ( let pointcloud of pointclouds ) {

    if ( !pointcloud.visible ) {
      continue;
    }

    pointcloud.updateMatrixWorld();

    if ( !pointcloudTransformVersion.has(pointcloud) ) {
      pointcloudTransformVersion.set(pointcloud, {number: 0, transform: pointcloud.matrixWorld.clone()});
    } else {
      let version = pointcloudTransformVersion.get(pointcloud);

      if ( !version.transform.equals(pointcloud.matrixWorld) ) {
        version.number++;
        version.transform.copy(pointcloud.matrixWorld);

        pointcloud.dispatchEvent({
          type: "transformation_changed",
          target: pointcloud
        });
      }
    }
  }

  while ( priorityQueue.size() > 0 ) {
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
    visible = visible && !(numVisiblePoints + node.getNumPoints() > Potree.pointBudget);
    visible = visible && !(numVisiblePointsInPointclouds.get(pointcloud) + node.getNumPoints() > pointcloud.pointBudget);
    visible = visible && level < maxLevel;
    visible = visible || node.getLevel() <= 2;

    let clipBoxes = pointcloud.material.clipBoxes;
    if ( true && clipBoxes.length > 0 ) {

      let numIntersecting = 0;
      let numIntersectionVolumes = 0;

      for ( let clipBox of clipBoxes ) {

        // Reuse pre-allocated objects to avoid massive GC pressure
        // (was ~22 THREE.js objects per node × clipBox per frame)
        if ( !_cbPcWorldInv ) {
          _cbPcWorldInv = new THREE.Matrix4();
          _cbPx  = new THREE.Vector3(); _cbNx  = new THREE.Vector3();
          _cbPy  = new THREE.Vector3(); _cbNy  = new THREE.Vector3();
          _cbPz  = new THREE.Vector3(); _cbNz  = new THREE.Vector3();
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

        if ( intersects ) {
          numIntersecting++;
        }
        numIntersectionVolumes++;
      }

      let insideAny = numIntersecting > 0;
      let insideAll = numIntersecting === numIntersectionVolumes;

      if ( pointcloud.material.clipTask === ClipTask.SHOW_INSIDE ) {
        if ( pointcloud.material.clipMethod === ClipMethod.INSIDE_ANY && insideAny ) {
          //node.debug = true
        } else if ( pointcloud.material.clipMethod === ClipMethod.INSIDE_ALL && insideAll ) {
          //node.debug = true;
        } else {
          visible = false;
        }
      } else if ( pointcloud.material.clipTask === ClipTask.SHOW_OUTSIDE ) {
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

    if ( node.spacing ) {
      lowestSpacing = Math.min(lowestSpacing, node.spacing);
    } else if ( node.geometryNode && node.geometryNode.spacing ) {
      lowestSpacing = Math.min(lowestSpacing, node.geometryNode.spacing);
    }

    if ( numVisiblePoints + node.getNumPoints() > Potree.pointBudget ) {
      break;
    }

    if ( !visible ) {
      continue;
    }

    // TODO: not used, same as the declaration?
    // numVisibleNodes++;
    numVisiblePoints += node.getNumPoints();
    let numVisiblePointsInPointcloud = numVisiblePointsInPointclouds.get(pointcloud);
    numVisiblePointsInPointclouds.set(pointcloud, numVisiblePointsInPointcloud + node.getNumPoints());

    pointcloud.numVisibleNodes++;
    pointcloud.numVisiblePoints += node.getNumPoints();

    if ( node.isGeometryNode() && (!parent || parent.isTreeNode()) ) {
      // Time-based GPU upload budget: upload as many nodes as fit within 5ms
      // instead of the fixed 2-node/frame limit. This dramatically reduces
      // the "pop-in" effect when loading large point clouds.
      let uploadBudgetMs = Potree.uploadBudgetMs || 5;
      if ( node.isLoaded() && (performance.now() - uploadStartTime) < uploadBudgetMs ) {
        node = pointcloud.toTreeNode(node, parent);
        loadedToGPUThisFrame++;
      } else {
        unloadedGeometry.push(node);
        visibleGeometry.push(node);
      }
    }

    if ( node.isTreeNode() ) {
      exports.lru.touch(node.geometryNode);
      node.sceneNode.visible = true;
      node.sceneNode.material = pointcloud.material;

      visibleNodes.push(node);
      pointcloud.visibleNodes.push(node);

      if ( node._transformVersion === undefined ) {
        node._transformVersion = -1;
      }
      let transformVersion = pointcloudTransformVersion.get(pointcloud);
      if ( node._transformVersion !== transformVersion.number ) {
        node.sceneNode.updateMatrix();
        node.sceneNode.matrixWorld.multiplyMatrices(pointcloud.matrixWorld, node.sceneNode.matrix);
        node._transformVersion = transformVersion.number;
      }

      if ( pointcloud.showBoundingBox && !node.boundingBoxNode && node.getBoundingBox ) {
        let boxHelper = new Box3Helper(node.getBoundingBox());
        boxHelper.matrixAutoUpdate = false;
        pointcloud.boundingBoxNodes.push(boxHelper);
        node.boundingBoxNode = boxHelper;
        node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
      } else if ( pointcloud.showBoundingBox ) {
        node.boundingBoxNode.visible = true;
        node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
      } else if ( !pointcloud.showBoundingBox && node.boundingBoxNode ) {
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
    for ( let i = 0; i < children.length; i++ ) {
      let child = children[i];

      let weight = 0;
      if ( camera.isPerspectiveCamera ) {
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

        if ( screenPixelRadius < pointcloud.minimumNodePixelSize ) {
          continue;
        }

        weight = screenPixelRadius;

        if ( distance - radius < 0 ) {
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
      .filter(p => (p.generateDEM && p.dem instanceof Potree.DEM));
    for ( let pointcloud of candidates ) {
      let updatingNodes = pointcloud.visibleNodes.filter(n => n.getLevel() <= maxDEMLevel);
      pointcloud.dem.update(updatingNodes);
    }
  }

  for ( let i = 0; i < Math.min(Potree.maxNodesLoading, unloadedGeometry.length); i++ ) {
    unloadedGeometry[i].load();
  }

  // --- Update visibility cache ---
  _cachedCameraMatrix.copy(camera.matrixWorldInverse);
  _cachedProjectionMatrix.copy(camera.projectionMatrix);
  _cachedPointBudget = Potree.pointBudget;
  _cachedPointcloudCount = pointclouds.length;
  visibilityDirty = false;

  _cachedResult = {
    visibleNodes: visibleNodes,
    numVisiblePoints: numVisiblePoints,
    lowestSpacing: lowestSpacing
  };

  return _cachedResult;
}

