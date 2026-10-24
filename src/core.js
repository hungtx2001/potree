/**
 * Potree Core Engine (Zero-DOM / Pure WebGL Point Cloud Streaming & Rendering)
 */

export * from "./defines.js";
export * from "./Enum.js";
export * from "./EventDispatcher.js";
export * from "./KeyCodes.js";
export * from "./LRU.js";
export * from "./WorkerPool.js";
export * from "./runtime.js";

// Materials & Shaders
export * from "./materials/ClassificationScheme.js";
export * from "./materials/EyeDomeLightingMaterial.js";
export * from "./materials/Gradients.js";
export * from "./materials/NormalizationEDLMaterial.js";
export * from "./materials/NormalizationMaterial.js";
export * from "./materials/PointCloudMaterial.js";
export { Shaders } from "./materials/shaders/shaders.js";

// Loaders & Attributes
export * from "./loader/PointAttributes.js";
export * from "./loader/POCLoader.js";
export * from "./modules/loader/2.0/OctreeLoader.js";
export * from "./modules/loader/2.0/OctreeGeometry.js";
export * from "./loader/EptLoader.js";
export * from "./loader/BinaryLoader.js";
export * from "./loader/LasLazLoader.js";

// Point Cloud 3D Scene Objects & Geometries
export * from "./Points.js";
export * from "./PointCloudTree.js";
export * from "./PointCloudOctree.js";
export * from "./PointCloudOctreeGeometry.js";
export * from "./PointCloudEptGeometry.js";
export * from "./PotreeRenderer.js";
export * from "./Potree_update_visibility.js";

// Helpers & Volumes
export * from "./utils/Box3Helper.js";
export * from "./utils/Volume.js";
export * from "./utils/ClipVolume.js";
export * from "./utils/PolygonClipVolume.js";
export * from "./TextSprite.js";
export * from "./XHRFactory.js";
export * from "./Version.js";
export * from "./viewer/store/PotreeStore.js";

import { OctreeLoader } from "./modules/loader/2.0/OctreeLoader.js";
import { POCLoader } from "./loader/POCLoader.js";
import { CopcLoader, EptLoader } from "./loader/EptLoader.js";
import { PointCloudOctree } from "./PointCloudOctree.js";

export const version = {
	major: 2,
	minor: 0,
	suffix: '.0-alpha.1'
};

/**
 * Universal Point Cloud Loader helper for potree/core
 */
export function loadPointCloud(path, name, callback) {
	return new Promise((resolve, reject) => {
		if (!path) {
			reject(new Error("Path is required"));
			return;
		}

		const handleLoaded = (geometry) => {
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

			const result = { type: 'pointcloud_loaded', pointcloud };
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
			OctreeLoader.load(path).then(e => {
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
