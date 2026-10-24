/**
 * Potree Core Engine (Pure WebGL Point Cloud Streaming, Shaders & Tools)
 * 100% Headless - Zero jQuery, Zero DOM coupling.
 */

// Types & Enums
export * from './types.js';

// Materials & Shaders
export * from './materials/index.js';

// Headless Spatial Measurement & Tools
export * from './tools/index.js';

// Core Octree & Geometry
export { PointCloudOctree, PointCloudOctreeNode } from '../PointCloudOctree.js';
export { PointCloudOctreeGeometry, PointCloudOctreeGeometryNode } from '../PointCloudOctreeGeometry.js';
export { PointCloudTree, PointCloudTreeNode } from '../PointCloudTree.js';
export { Points } from '../Points.js';
export { Renderer, Renderer as PotreeRenderer } from '../PotreeRenderer.js';
export { updatePointClouds } from '../Potree_update_visibility.js';
export { runtime, workerPool, lru } from '../runtime.js';

// Headless Navigation
export { OrbitControls } from '../navigation/OrbitControls.js';
export { FirstPersonControls } from '../navigation/FirstPersonControls.js';
export { EarthControls } from '../navigation/EarthControls.js';
export { DeviceOrientationControls } from '../navigation/DeviceOrientationControls.js';
export { OrientedImageControls } from '../modules/OrientedImages/OrientedImageControls.js';

// Loaders
export { OctreeLoader, POCLoader, CopcLoader, EptLoader } from './loader/index.js';

// Headless Viewport & Scene
export { Viewer } from '../viewer/viewer.js';
export { Scene } from '../viewer/Scene.js';
export { PotreeStore } from '../viewer/store/PotreeStore.js';
export { Utils } from '../utils.js';

import { OctreeLoader, POCLoader, CopcLoader, EptLoader } from './loader/index.js';
import { PointCloudOctree } from '../PointCloudOctree.js';
import type { LoadPointCloudResult } from './types.js';

export const version = {
	major: 2,
	minor: 0,
	suffix: '.0-alpha.1'
};

/**
 * Universal Point Cloud Loader helper for potree/core
 */
export function loadPointCloud(
	path: string,
	name?: string,
	callback?: (res: LoadPointCloudResult) => void
): Promise<LoadPointCloudResult> {
	return new Promise((resolve, reject) => {
		if (!path) {
			reject(new Error("Path is required"));
			return;
		}

		const handleLoaded = (geometry: any) => {
			if (!geometry) {
				const err = new Error(`Failed to load point cloud from: ${path}`);
				if (callback) callback({ type: 'loading_failed', error: err });
				reject(err);
				return;
			}
			const pointcloud = new PointCloudOctree(geometry);
			pointcloud.name = name || 'pointcloud';

			if (geometry.offset) {
				pointcloud.position.copy(geometry.offset).multiplyScalar(-1);
			}

			const aPosition = pointcloud.getAttribute?.('position');
			if (aPosition && aPosition.range && pointcloud.material) {
				pointcloud.material.elevationRange = [
					aPosition.range[0][2],
					aPosition.range[1][2],
				];
			}

			const result: LoadPointCloudResult = { type: 'pointcloud_loaded', pointcloud };
			if (callback) callback(result);
			resolve(result);
		};

		if (path.includes('ept.json')) {
			EptLoader.load(path, handleLoaded);
		} else if (path.includes('.copc.laz')) {
			CopcLoader.load(path, handleLoaded);
		} else if (path.includes('cloud.js')) {
			POCLoader.load(path, handleLoaded);
		} else if (path.includes('metadata.json')) {
			OctreeLoader.load(path).then((e: any) => {
				if (!e || !e.geometry) {
					handleLoaded(null);
				} else {
					handleLoaded(e.geometry);
				}
			}).catch(reject);
		} else {
			reject(new Error(`Unsupported point cloud format: ${path}`));
		}
	});
}
