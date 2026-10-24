export const CameraMode = {
	ORTHOGRAPHIC: 0,
	PERSPECTIVE: 1,
	VR: 2,
} as const;
export type CameraMode = (typeof CameraMode)[keyof typeof CameraMode];

export const ClipTask = {
	NONE: 0,
	HIGHLIGHT: 1,
	SHOW_INSIDE: 2,
	SHOW_OUTSIDE: 3,
} as const;
export type ClipTask = (typeof ClipTask)[keyof typeof ClipTask];

export const ClipMethod = {
	INSIDE_ANY: 0,
	INSIDE_ALL: 1,
} as const;
export type ClipMethod = (typeof ClipMethod)[keyof typeof ClipMethod];

export const ElevationGradientRepeat = {
	CLAMP: 0,
	REPEAT: 1,
	MIRRORED_REPEAT: 2,
} as const;
export type ElevationGradientRepeat = (typeof ElevationGradientRepeat)[keyof typeof ElevationGradientRepeat];

export const MOUSE = {
	LEFT: 0b0001,
	RIGHT: 0b0010,
	MIDDLE: 0b0100,
} as const;
export type MOUSE = (typeof MOUSE)[keyof typeof MOUSE];

export const PointSizeType = {
	FIXED: 0,
	ATTENUATED: 1,
	ADAPTIVE: 2,
} as const;
export type PointSizeType = (typeof PointSizeType)[keyof typeof PointSizeType];

export const PointShape = {
	SQUARE: 0,
	CIRCLE: 1,
	PARABOLOID: 2,
} as const;
export type PointShape = (typeof PointShape)[keyof typeof PointShape];

export const TreeType = {
	OCTREE: 0,
	KDTREE: 1,
} as const;
export type TreeType = (typeof TreeType)[keyof typeof TreeType];

export interface LengthUnit {
	code: string;
	unitspermeter: number;
}

export const LengthUnits: Record<string, LengthUnit> = {
	METER: { code: 'm', unitspermeter: 1.0 },
	FEET: { code: 'ft', unitspermeter: 3.28084 },
	INCH: { code: '\u2033', unitspermeter: 39.3701 },
};
