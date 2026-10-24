/**
 * Potree Core Engine (Zero-DOM / Pure WebGL Point Cloud Streaming & Rendering)
 */

// Foundation & Runtime
import {
	CameraMode,
	ClipTask,
	ClipMethod,
	ElevationGradientRepeat,
	MOUSE,
	PointSizeType,
	PointShape,
	TreeType,
	LengthUnits
} from "./defines.js";
import { Enum } from "./Enum.js";
import { EventDispatcher } from "./EventDispatcher.js";
import { KeyCodes } from "./KeyCodes.js";
import { LRU, LRUItem } from "./LRU.js";
import { WorkerPool } from "./WorkerPool.js";
import { runtime, workerPool, lru } from "./runtime.js";

// Materials & Shaders
import { ClassificationScheme } from "./materials/ClassificationScheme.js";
import { EyeDomeLightingMaterial } from "./materials/EyeDomeLightingMaterial.js";
import { Gradients } from "./materials/Gradients.js";
import { NormalizationEDLMaterial } from "./materials/NormalizationEDLMaterial.js";
import { NormalizationMaterial } from "./materials/NormalizationMaterial.js";
import { PointCloudMaterial } from "./materials/PointCloudMaterial.js";
import { Shaders } from "./materials/shaders/shaders.js";

// Loaders & Attributes
import {
	PointAttribute,
	PointAttributes,
	PointAttributeTypes
} from "./loader/PointAttributes.js";
import { POCLoader } from "./loader/POCLoader.js";
import { OctreeLoader, NodeLoader } from "./modules/loader/2.0/OctreeLoader.js";
import { OctreeGeometry, OctreeGeometryNode } from "./modules/loader/2.0/OctreeGeometry.js";
import { EptLoader, CopcLoader } from "./loader/EptLoader.js";
import { BinaryLoader } from "./loader/BinaryLoader.js";
import { LasLazLoader } from "./loader/LasLazLoader.js";

// Point Cloud 3D Scene Objects & Geometries
import { Points } from "./Points.js";
import { PointCloudTree, PointCloudTreeNode } from "./PointCloudTree.js";
import { PointCloudOctree, PointCloudOctreeNode } from "./PointCloudOctree.js";
import { PointCloudOctreeGeometry, PointCloudOctreeGeometryNode } from "./PointCloudOctreeGeometry.js";
import {
	PointCloudCopcGeometry,
	PointCloudEptGeometry,
	PointCloudCopcGeometryNode
} from "./PointCloudEptGeometry.js";
import { Renderer } from "./PotreeRenderer.js";
import { updatePointClouds } from "./Potree_update_visibility.js";

// Helpers & Volumes
import { Box3Helper } from "./utils/Box3Helper.js";
import { Volume, BoxVolume, SphereVolume } from "./utils/Volume.js";
import { ClipVolume } from "./utils/ClipVolume.js";
import { PolygonClipVolume } from "./utils/PolygonClipVolume.js";
import { TextSprite } from "./TextSprite.js";
import { XHRFactory } from "./XHRFactory.js";
import { Version } from "./Version.js";
import { PotreeStore } from "./viewer/store/PotreeStore.js";

export {
	CameraMode,
	ClipTask,
	ClipMethod,
	ElevationGradientRepeat,
	MOUSE,
	PointSizeType,
	PointShape,
	TreeType,
	LengthUnits,
	Enum,
	EventDispatcher,
	KeyCodes,
	LRU,
	LRUItem,
	WorkerPool,
	runtime,
	workerPool,
	lru,
	ClassificationScheme,
	EyeDomeLightingMaterial,
	Gradients,
	NormalizationEDLMaterial,
	NormalizationMaterial,
	PointCloudMaterial,
	Shaders,
	PointAttribute,
	PointAttributes,
	PointAttributeTypes,
	POCLoader,
	OctreeLoader,
	NodeLoader,
	OctreeGeometry,
	OctreeGeometryNode,
	EptLoader,
	CopcLoader,
	BinaryLoader,
	LasLazLoader,
	Points,
	PointCloudTree,
	PointCloudTreeNode,
	PointCloudOctree,
	PointCloudOctreeNode,
	PointCloudOctreeGeometry,
	PointCloudOctreeGeometryNode,
	PointCloudCopcGeometry,
	PointCloudEptGeometry,
	PointCloudCopcGeometryNode,
	Renderer,
	Renderer as PotreeRenderer,
	updatePointClouds,
	Box3Helper,
	Volume,
	BoxVolume,
	SphereVolume,
	ClipVolume,
	PolygonClipVolume,
	TextSprite,
	XHRFactory,
	Version,
	PotreeStore
};

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
