import * as THREE from 'three';

export enum CameraMode {
	PERSPECTIVE = 0,
	ORTHOGRAPHIC = 1,
	VR = 2,
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

export const MOUSE = {
	LEFT: 0b0001,
	RIGHT: 0b0010,
	MIDDLE: 0b0100,
} as const;
export type MOUSE = (typeof MOUSE)[keyof typeof MOUSE];

export enum TreeType {
	OCTREE = 0,
	KDTREE = 1,
}

export const KeyCodes = {
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	BOTTOM: 40,
	DELETE: 46,

	A: 'A'.charCodeAt(0),
	S: 'S'.charCodeAt(0),
	D: 'D'.charCodeAt(0),
	W: 'W'.charCodeAt(0),
	Q: 'Q'.charCodeAt(0),
	E: 'E'.charCodeAt(0),
	R: 'R'.charCodeAt(0),
	F: 'F'.charCodeAt(0),
} as const;
export type KeyCodes = (typeof KeyCodes)[keyof typeof KeyCodes];

export { PointAttribute, PointAttributes, PointAttributeTypes, type PointAttributeType } from './loader/PointAttributes.js';

export interface LoadPointCloudResult {
	type: 'pointcloud_loaded' | 'loading_failed';
	pointcloud?: any;
	error?: Error;
}
