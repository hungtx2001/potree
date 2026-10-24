export interface PointAttributeType {
	ordinal: number;
	name: string;
	size: number;
}

export const PointAttributeTypes: Record<string, PointAttributeType> & Record<number, PointAttributeType> = {
	DATA_TYPE_DOUBLE: { ordinal: 0, name: 'double', size: 8 },
	DATA_TYPE_FLOAT: { ordinal: 1, name: 'float', size: 4 },
	DATA_TYPE_INT8: { ordinal: 2, name: 'int8', size: 1 },
	DATA_TYPE_UINT8: { ordinal: 3, name: 'uint8', size: 1 },
	DATA_TYPE_INT16: { ordinal: 4, name: 'int16', size: 2 },
	DATA_TYPE_UINT16: { ordinal: 5, name: 'uint16', size: 2 },
	DATA_TYPE_INT32: { ordinal: 6, name: 'int32', size: 4 },
	DATA_TYPE_UINT32: { ordinal: 7, name: 'uint32', size: 4 },
	DATA_TYPE_INT64: { ordinal: 8, name: 'int64', size: 8 },
	DATA_TYPE_UINT64: { ordinal: 9, name: 'uint64', size: 8 },
	0: { ordinal: 0, name: 'double', size: 8 },
	1: { ordinal: 1, name: 'float', size: 4 },
	2: { ordinal: 2, name: 'int8', size: 1 },
	3: { ordinal: 3, name: 'uint8', size: 1 },
	4: { ordinal: 4, name: 'int16', size: 2 },
	5: { ordinal: 5, name: 'uint16', size: 2 },
	6: { ordinal: 6, name: 'int32', size: 4 },
	7: { ordinal: 7, name: 'uint32', size: 4 },
	8: { ordinal: 8, name: 'int64', size: 8 },
	9: { ordinal: 9, name: 'uint64', size: 8 },
};

export class PointAttribute {
	public name: string;
	public type: PointAttributeType;
	public numElements: number;
	public byteSize: number;
	public description: string = '';
	public range: [number, number] = [Infinity, -Infinity];

	constructor(name: string, type: PointAttributeType, numElements: number) {
		this.name = name;
		this.type = type;
		this.numElements = numElements;
		this.byteSize = this.numElements * this.type.size;
	}

	static readonly POSITION_CARTESIAN = new PointAttribute('POSITION_CARTESIAN', PointAttributeTypes.DATA_TYPE_FLOAT, 3);
	static readonly RGBA_PACKED = new PointAttribute('COLOR_PACKED', PointAttributeTypes.DATA_TYPE_INT8, 4);
	static readonly COLOR_PACKED = PointAttribute.RGBA_PACKED;
	static readonly RGB_PACKED = new PointAttribute('COLOR_PACKED', PointAttributeTypes.DATA_TYPE_INT8, 3);
	static readonly NORMAL_FLOATS = new PointAttribute('NORMAL_FLOATS', PointAttributeTypes.DATA_TYPE_FLOAT, 3);
	static readonly INTENSITY = new PointAttribute('INTENSITY', PointAttributeTypes.DATA_TYPE_UINT16, 1);
	static readonly CLASSIFICATION = new PointAttribute('CLASSIFICATION', PointAttributeTypes.DATA_TYPE_UINT8, 1);
	static readonly NORMAL_SPHEREMAPPED = new PointAttribute('NORMAL_SPHEREMAPPED', PointAttributeTypes.DATA_TYPE_UINT8, 2);
	static readonly NORMAL_OCT16 = new PointAttribute('NORMAL_OCT16', PointAttributeTypes.DATA_TYPE_UINT8, 2);
	static readonly NORMAL = new PointAttribute('NORMAL', PointAttributeTypes.DATA_TYPE_FLOAT, 3);
	static readonly RETURN_NUMBER = new PointAttribute('RETURN_NUMBER', PointAttributeTypes.DATA_TYPE_UINT8, 1);
	static readonly NUMBER_OF_RETURNS = new PointAttribute('NUMBER_OF_RETURNS', PointAttributeTypes.DATA_TYPE_UINT8, 1);
	static readonly SOURCE_ID = new PointAttribute('SOURCE_ID', PointAttributeTypes.DATA_TYPE_UINT16, 1);
	static readonly INDICES = new PointAttribute('INDICES', PointAttributeTypes.DATA_TYPE_UINT32, 1);
	static readonly SPACING = new PointAttribute('SPACING', PointAttributeTypes.DATA_TYPE_FLOAT, 1);
	static readonly GPS_TIME = new PointAttribute('GPS_TIME', PointAttributeTypes.DATA_TYPE_DOUBLE, 1);
	[key: string]: any;
}

export class PointAttributes {
	public attributes: PointAttribute[] = [];
	public byteSize: number = 0;
	public size: number = 0;
	public vectors: any[] = [];

	constructor(pointAttributes?: (string | PointAttribute)[]) {
		if (pointAttributes != null) {
			for (let i = 0; i < pointAttributes.length; i++) {
				const attr = pointAttributes[i];
				const pointAttribute = typeof attr === 'string' ? (PointAttribute as any)[attr] : attr;
				if (pointAttribute) {
					this.attributes.push(pointAttribute);
					this.byteSize += pointAttribute.byteSize;
					this.size++;
				}
			}
		}
	}

	add(pointAttribute: PointAttribute): void {
		this.attributes.push(pointAttribute);
		this.byteSize += pointAttribute.byteSize;
		this.size++;
	}

	addVector(vector: any): void {
		this.vectors.push(vector);
	}

	hasNormals(): boolean {
		for (const pointAttribute of this.attributes) {
			if (
				pointAttribute === PointAttribute.NORMAL_SPHEREMAPPED ||
				pointAttribute === PointAttribute.NORMAL_FLOATS ||
				pointAttribute === PointAttribute.NORMAL ||
				pointAttribute === PointAttribute.NORMAL_OCT16
			) {
				return true;
			}
		}
		return false;
	}
}
