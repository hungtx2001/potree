/**
 * Potree Core Engine (Pure WebGL Point Cloud Streaming, Shaders & Tools)
 * 100% Headless - Zero jQuery, Zero DOM coupling.
 */

// Types & Enums
export * from './types.js';
export { EventDispatcher, type EventRecord, type EventListener } from './EventDispatcher.js';

// Materials & Shaders
export { EyeDomeLightingMaterial } from './materials/EyeDomeLightingMaterial.js';
export { BlurMaterial } from './materials/BlurMaterial.js';
export { NormalizationMaterial } from './materials/NormalizationMaterial.js';
export { NormalizationEDLMaterial } from './materials/NormalizationEDLMaterial.js';
export { Gradients, generateGradientTexture } from './materials/Gradients.js';
export { ClassificationScheme, generateClassificationTexture } from './materials/ClassificationScheme.js';
export { PointCloudMaterial } from './materials/PointCloudMaterial.js';

// Headless Spatial Measurement & Tools
export { MeasurementEngine, type DistanceResult, type AreaResult, type AngleResult, type VolumeResult } from './tools/MeasurementEngine.js';
export { Exporters, type ExportablePoint, type ExportableMeasurement } from './tools/Exporters.js';
export { TextSprite } from './tools/TextSprite.js';
export { Action, type ActionArgs } from './tools/Actions.js';
export { AnimationPath, PathAnimation } from './tools/AnimationPath.js';
export { ProfileRequest, ProfileData, type ProfileSegment } from './tools/ProfileRequest.js';
export { Measure, type MeasurePoint } from './tools/Measure.js';
export { Volume, BoxVolume, SphereVolume, type VolumeArgs } from './tools/Volume.js';
export { ClipVolume, type ClipVolumeArgs } from './tools/ClipVolume.js';
export { PolygonClipVolume } from './tools/PolygonClipVolume.js';
export { Profile } from './tools/Profile.js';
export { Annotation, type AnnotationArgs } from './tools/Annotation.js';
export { AnnotationTool } from './tools/AnnotationTool.js';
export { MeasuringTool } from './tools/MeasuringTool.js';
export { ProfileTool } from './tools/ProfileTool.js';
export { VolumeTool } from './tools/VolumeTool.js';
export { ClippingTool } from './tools/ClippingTool.js';
export { TransformationTool, type TransformHandle } from './tools/TransformationTool.js';
export { ScreenBoxSelectTool } from './tools/ScreenBoxSelectTool.js';
export { Compass } from './tools/Compass.js';
export { CameraAnimation, ControlPoint, type AnimationFrame } from './tools/CameraAnimation.js';
export { Images360, Image360, Images360Loader } from './tools/Images360.js';
export { OrientedImage, OrientedImages, OrientedImageLoader } from './tools/OrientedImages.js';

// Core Octree & Geometry
export { Points } from './octree/Points.js';
export { PointCloudTree, PointCloudTreeNode } from './octree/PointCloudTree.js';
export { InterleavedBuffer, InterleavedBufferAttribute } from './octree/InterleavedBuffer.js';
export { BitReader } from './octree/BitReader.js';
export { PointCloudOctreeGeometry, PointCloudOctreeGeometryNode } from './octree/PointCloudOctreeGeometry.js';
export { PointCloudOctree, PointCloudOctreeNode } from './octree/PointCloudOctree.js';
export { PointCloudEptGeometry, PointCloudCopcGeometry, PointCloudCopcGeometryNode } from './octree/PointCloudEptGeometry.js';

// Core Rendering & Visibility
export {
	updatePointClouds,
	updateVisibility,
	updateVisibilityStructures,
	markVisibilityDirty,
	visibilityDirty
} from './rendering/Potree_update_visibility.js';
export { Renderer, Renderer as PotreeRenderer } from './rendering/PotreeRenderer.js';
export { PointCloudSM } from './rendering/PointCloudSM.js';
export { EDLRenderer } from './rendering/EDLRenderer.js';
export { HQSplatRenderer } from './rendering/HQSplatRenderer.js';
export { StandardRenderer } from './rendering/StandardRenderer.js';
export { runtime, workerPool, lru, version as runtimeVersion, type RuntimeConfig } from './runtime/runtime.js';
export { LRU, LRUItem } from './runtime/LRU.js';
export { WorkerPool, type WorkerFactory } from './runtime/WorkerPool.js';

// Headless Navigation
export { OrbitControls } from './navigation/OrbitControls.js';
export { FirstPersonControls } from './navigation/FirstPersonControls.js';
export { EarthControls } from './navigation/EarthControls.js';
export { DeviceOrientationControls } from './navigation/DeviceOrientationControls.js';
export { VRControls } from './navigation/VRControls.js';
export { GeoControls } from './navigation/GeoControls.js';
export { InputHandler } from './navigation/InputHandler.js';
export { CesiumControls, type CesiumProjection } from './navigation/CesiumControls.js';
export { View } from './navigation/View.js';
export { NavigationCube } from './navigation/NavigationCube.js';
export { OrientedImageControls } from './navigation/OrientedImageControls.js';

// Arena4D kd-tree format
export { PointCloudArena4DNode, PointCloudArena4D } from './arena4d/PointCloudArena4D.js';
export { PointCloudArena4DGeometryNode, PointCloudArena4DGeometry } from './arena4d/PointCloudArena4DGeometry.js';

// Loaders
export * from './loader/PointAttributes.js';
export * from './loader/OctreeGeometry.js';
export * from './loader/OctreeLoader.js';
export * from './loader/BinaryLoader.js';
export * from './loader/POCLoader.js';
export * from './loader/EptLoader.js';
export * from './loader/ShapefileLoader.js';
export * from './loader/GeoPackageLoader.js';
export * from './loader/LasLazLoader.js';

// Scene
export { Scene } from './Scene.js';

// Core Utilities & Math
export * from './utils/BinaryHeap.js';
export * from './utils/Box3Helper.js';
export * from './utils/SpotLightHelper.js';
export * from './utils/Enum.js';
export * from './utils/Version.js';
export * from './utils/Features.js';
export * from './utils/XHRFactory.js';
export * from './utils/Utils.js';
export * from './utils/Message.js';
export * from './utils/GeoTIFF.js';
export * from './utils/CameraExtensions.js';

import { OctreeLoader } from './loader/OctreeLoader.js';
import { POCLoader } from './loader/POCLoader.js';
import { EptLoader, CopcLoader } from './loader/EptLoader.js';
import { PointCloudOctree } from './octree/PointCloudOctree.js';
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
