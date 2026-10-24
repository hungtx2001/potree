/**
 * Potree Core Engine (Pure WebGL Point Cloud Streaming, Shaders & Tools)
 * 100% Headless - Zero jQuery, Zero DOM coupling.
 */

import { OctreeLoader } from "./modules/loader/2.0/OctreeLoader.js";
import { POCLoader } from "./loader/POCLoader.js";
import { CopcLoader, EptLoader } from "./loader/EptLoader.js";
import { PointCloudOctree } from "./PointCloudOctree.js";

// Core Octree & Geometry
export { PointCloudOctree, PointCloudOctreeNode } from "./PointCloudOctree.js";
export { PointCloudOctreeGeometry, PointCloudOctreeGeometryNode } from "./PointCloudOctreeGeometry.js";
export { PointCloudTree, PointCloudTreeNode } from "./PointCloudTree.js";
export { Points } from "./Points.js";
export { Renderer, Renderer as PotreeRenderer } from "./PotreeRenderer.js";
export { updatePointClouds } from "./Potree_update_visibility.js";
export { runtime, workerPool, lru } from "./runtime.js";

// Shaders & Materials
export { PointCloudMaterial } from "./materials/PointCloudMaterial.js";
export { EyeDomeLightingMaterial } from "./materials/EyeDomeLightingMaterial.js";
export { ClassificationScheme } from "./materials/ClassificationScheme.js";
export { Gradients } from "./materials/Gradients.js";

// Constants & Enums
export { 
	CameraMode, 
	PointSizeType, 
	PointShape, 
	ClipTask, 
	ClipMethod, 
	ElevationGradientRepeat, 
	LengthUnits 
} from "./defines.js";

// Headless Spatial Tools & Math
export { Measure } from "./utils/Measure.js";
export { MeasuringTool } from "./utils/MeasuringTool.js";
export { Profile } from "./utils/Profile.js";
export { ProfileTool } from "./utils/ProfileTool.js";
export { Volume, BoxVolume, SphereVolume } from "./utils/Volume.js";
export { VolumeTool } from "./utils/VolumeTool.js";
export { PolygonClipVolume } from "./utils/PolygonClipVolume.js";
export { ClippingTool } from "./utils/ClippingTool.js";
export { TransformationTool } from "./utils/TransformationTool.js";
export { Annotation } from "./Annotation.js";
export { Utils } from "./utils.js";

// Headless Navigation
export { OrbitControls } from "./navigation/OrbitControls.js";
export { FirstPersonControls } from "./navigation/FirstPersonControls.js";
export { EarthControls } from "./navigation/EarthControls.js";
export { DeviceOrientationControls } from "./navigation/DeviceOrientationControls.js";
export { OrientedImageControls } from "./modules/OrientedImages/OrientedImageControls.js";

// Loaders
export { OctreeLoader } from "./modules/loader/2.0/OctreeLoader.js";
export { POCLoader } from "./loader/POCLoader.js";
export { CopcLoader, EptLoader } from "./loader/EptLoader.js";
export { PointAttribute, PointAttributes, PointAttributeTypes } from "./loader/PointAttributes.js";

// Headless Viewport & Scene
export { Viewer } from "./viewer/viewer.js";
export { Scene } from "./viewer/Scene.js";
export { PotreeStore } from "./viewer/store/PotreeStore.js";

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
