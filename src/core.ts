/**
 * Potree Core Engine (Pure WebGL Point Cloud Streaming & Rendering)
 * Focused runtime engine without bloated monolithic re-exports.
 */

export { PointCloudOctree, PointCloudOctreeNode } from "./PointCloudOctree.js";
export { PointCloudTree, PointCloudTreeNode } from "./PointCloudTree.js";
export { Points } from "./Points.js";
export { Renderer, Renderer as PotreeRenderer } from "./PotreeRenderer.js";
export { updatePointClouds } from "./Potree_update_visibility.js";
export { runtime, workerPool, lru } from "./runtime.js";

import { OctreeLoader } from "./modules/loader/2.0/OctreeLoader.js";
import { POCLoader } from "./loader/POCLoader.js";
import { CopcLoader, EptLoader } from "./loader/EptLoader.js";
import { PointCloudOctree } from "./PointCloudOctree.js";

export const version = {
	major: 2,
	minor: 0,
	suffix: '.0-alpha.1'
};

export interface LoadPointCloudResult {
	type: 'pointcloud_loaded' | 'loading_failed';
	pointcloud?: PointCloudOctree;
	error?: Error;
}

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
