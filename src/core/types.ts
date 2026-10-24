import * as THREE from 'three';

export enum CameraMode {
	PERSPECTIVE = 0,
	ORTHOGRAPHIC = 1,
}

export enum PointSizeType {
	FIXED = 0,
	ATTENUATED = 1,
	ADAPTIVE = 2,
}

export enum PointShape {
	SQUARE = 0,
	CIRCLE = 1,
	PARABOLOID = 2,
}

export enum PointColorType {
	RGB = 0,
	COLOR = 1,
	DEPTH = 2,
	HEIGHT = 3,
	ELEVATION = 3,
	INTENSITY = 4,
	INTENSITY_GRADIENT = 5,
	LOD = 6,
	LEVEL_OF_DETAIL = 6,
	POINT_INDEX = 7,
	CLASSIFICATION = 8,
	RETURN_NUMBER = 9,
	SOURCE = 10,
	NORMAL = 11,
	PHONG = 12,
	RGB_HEIGHT = 13,
	GPS_TIME = 14,
	COMPOSITE = 15,
}

export enum ClipTask {
	NONE = 0,
	HIGHLIGHT = 1,
	SHOW_INSIDE = 2,
	SHOW_OUTSIDE = 3,
}

export enum ClipMethod {
	INSIDE_ANY = 1,
	INSIDE_ALL = 2,
}

export enum ElevationGradientRepeat {
	CLAMP = 0,
	REPEAT = 1,
	MIRRORED_REPEAT = 2,
}

export enum LengthUnits {
	METER = 'm',
	FEET = 'ft',
	INCH = 'in',
}

export enum TreeType {
	OCTREE = 0,
	KDTREE = 1,
}

export { PointAttribute, PointAttributes, PointAttributeTypes, type PointAttributeType } from './loader/PointAttributes.js';

export interface LoadPointCloudResult {
	type: 'pointcloud_loaded' | 'loading_failed';
	pointcloud?: any;
	error?: Error;
}
