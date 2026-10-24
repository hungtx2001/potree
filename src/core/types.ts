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

export interface PointAttributeTypeInfo {
	ordinal: number;
	name: string;
	size: number;
}

export const PointAttributeTypes: Record<string, PointAttributeTypeInfo> = {
	DATA_TYPE_DOUBLE: { ordinal: 0, name: 'double', size: 8 },
	DATA_TYPE_FLOAT:  { ordinal: 1, name: 'float',  size: 4 },
	DATA_TYPE_INT8:   { ordinal: 2, name: 'int8',   size: 1 },
	DATA_TYPE_UINT8:  { ordinal: 3, name: 'uint8',  size: 1 },
	DATA_TYPE_INT16:  { ordinal: 4, name: 'int16',  size: 2 },
	DATA_TYPE_UINT16: { ordinal: 5, name: 'uint16', size: 2 },
	DATA_TYPE_INT32:  { ordinal: 6, name: 'int32',  size: 4 },
	DATA_TYPE_UINT32: { ordinal: 7, name: 'uint32', size: 4 },
	DATA_TYPE_INT64:  { ordinal: 8, name: 'int64',  size: 8 },
	DATA_TYPE_UINT64: { ordinal: 9, name: 'uint64', size: 8 },
};

export interface PointAttribute {
	name: string;
	type: PointAttributeTypeInfo;
	numElements: number;
	byteSize: number;
	description?: string;
	initialRange?: [number, number];
}

export interface PointAttributes {
	attributes: PointAttribute[];
	byteSize: number;
	size: number;
}

export interface LoadPointCloudResult {
	type: 'pointcloud_loaded' | 'loading_failed';
	pointcloud?: any;
	error?: Error;
}
