import { Enum } from './Enum.js';

export const Endianness = new Enum({
	LITTLE: 'II',
	BIG: 'MM',
});

export const Type = new Enum({
	BYTE: { value: 1, bytes: 1 },
	ASCII: { value: 2, bytes: 1 },
	SHORT: { value: 3, bytes: 2 },
	LONG: { value: 4, bytes: 4 },
	RATIONAL: { value: 5, bytes: 8 },
	SBYTE: { value: 6, bytes: 1 },
	UNDEFINED: { value: 7, bytes: 1 },
	SSHORT: { value: 8, bytes: 2 },
	SLONG: { value: 9, bytes: 4 },
	SRATIONAL: { value: 10, bytes: 8 },
	FLOAT: { value: 11, bytes: 4 },
	DOUBLE: { value: 12, bytes: 8 },
});

export const Tag = new Enum({
	IMAGE_WIDTH: 256,
	IMAGE_HEIGHT: 257,
	BITS_PER_SAMPLE: 258,
	COMPRESSION: 259,
	PHOTOMETRIC_INTERPRETATION: 262,
	STRIP_OFFSETS: 273,
	ORIENTATION: 274,
	SAMPLES_PER_PIXEL: 277,
	ROWS_PER_STRIP: 278,
	STRIP_BYTE_COUNTS: 279,
	X_RESOLUTION: 282,
	Y_RESOLUTION: 283,
	PLANAR_CONFIGURATION: 284,
	RESOLUTION_UNIT: 296,
	SOFTWARE: 305,
	COLOR_MAP: 320,
	SAMPLE_FORMAT: 339,
	MODEL_PIXEL_SCALE: 33550,
	MODEL_TIEPOINT: 33922,
	GEO_KEY_DIRECTORY: 34735,
	GEO_DOUBLE_PARAMS: 34736,
	GEO_ASCII_PARAMS: 34737,
});

const typeMapping = new Map<any, any>([
	[Type.BYTE, Uint8Array],
	[Type.ASCII, Uint8Array],
	[Type.SHORT, Uint16Array],
	[Type.LONG, Uint32Array],
	[Type.RATIONAL, Uint32Array],
	[Type.SBYTE, Int8Array],
	[Type.UNDEFINED, Uint8Array],
	[Type.SSHORT, Int16Array],
	[Type.SLONG, Int32Array],
	[Type.SRATIONAL, Int32Array],
	[Type.FLOAT, Float32Array],
	[Type.DOUBLE, Float64Array],
]);

export class IFDEntry {
	tag: any;
	type: any;
	count: number;
	offset: any;
	value: any;

	constructor(tag: any, type: any, count: number, offset: any, value: any) {
		this.tag = tag;
		this.type = type;
		this.count = count;
		this.offset = offset;
		this.value = value;
	}
}

export class GeoTIFFImage {
	width: number;
	height: number;
	buffer: Uint8Array | null;
	metadata: IFDEntry[];

	constructor() {
		this.width = 0;
		this.height = 0;
		this.buffer = null;
		this.metadata = [];
	}
}

export class Reader {
	static read(data: any): GeoTIFFImage {
		const endiannessTag = String.fromCharCode(...(Array.from(data.slice(0, 2)) as number[]));
		const _endianness = Endianness.fromValue(endiannessTag);

		const tiffCheckTag = data.readUInt8 ? data.readUInt8(2) : data[2];

		if (tiffCheckTag !== 42) {
			throw new Error('not a valid tiff file');
		}

		const readU32 = (offset: number) => {
			if (data.readUInt32LE) return data.readUInt32LE(offset);
			const view = new DataView(data.buffer, data.byteOffset + offset, 4);
			return view.getUint32(0, true);
		};

		const readU16 = (offset: number) => {
			if (data.readUInt16LE) return data.readUInt16LE(offset);
			const view = new DataView(data.buffer, data.byteOffset + offset, 2);
			return view.getUint16(0, true);
		};

		const offsetToFirstIFD = readU32(4);

		const ifds: IFDEntry[] = [];
		const IFDsRead = false;
		let currentIFDOffset = offsetToFirstIFD;
		let iter = 0;
		while (IFDsRead || iter < 100) {
			const numEntries = readU16(currentIFDOffset);
			const nextIFDOffset = readU32(currentIFDOffset + 2 + numEntries * 12);

			const entryBuffer = data.slice(currentIFDOffset + 2, currentIFDOffset + 2 + 12 * numEntries);

			const readEntryU16 = (offset: number) => {
				if (entryBuffer.readUInt16LE) return entryBuffer.readUInt16LE(offset);
				const view = new DataView(entryBuffer.buffer, entryBuffer.byteOffset + offset, 2);
				return view.getUint16(0, true);
			};
			const readEntryU32 = (offset: number) => {
				if (entryBuffer.readUInt32LE) return entryBuffer.readUInt32LE(offset);
				const view = new DataView(entryBuffer.buffer, entryBuffer.byteOffset + offset, 4);
				return view.getUint32(0, true);
			};

			for (let i = 0; i < numEntries; i++) {
				const tag = Tag.fromValue(readEntryU16(i * 12));
				const type = Type.fromValue(readEntryU16(i * 12 + 2));
				const count = readEntryU32(i * 12 + 4);
				const offsetOrValue = readEntryU32(i * 12 + 8);
				const valueBytes = type.bytes * count;

				let value: any;
				if (valueBytes <= 4) {
					value = offsetOrValue;
				} else {
					const valueBuffer = new Uint8Array(valueBytes);
					valueBuffer.set(data.slice(offsetOrValue, offsetOrValue + valueBytes));

					const ArrayType = typeMapping.get(type) || Uint8Array;
					value = new ArrayType(valueBuffer.buffer);

					if (type === Type.ASCII) {
						value = String.fromCharCode(...value);
					}
				}

				const ifd = new IFDEntry(tag, type, count, offsetOrValue, value);
				ifds.push(ifd);
			}

			if (nextIFDOffset === 0) {
				break;
			}

			currentIFDOffset = nextIFDOffset;
			iter++;
		}

		const ifdForTag = (tag: any) => {
			for (const entry of ifds) {
				if (entry.tag === tag) {
					return entry;
				}
			}
			return null;
		};

		const width = ifdForTag(Tag.IMAGE_WIDTH)?.value || 0;
		const height = ifdForTag(Tag.IMAGE_HEIGHT)?.value || 0;
		const rowsPerStrip = ifdForTag(Tag.ROWS_PER_STRIP)?.value || 1;
		const ifdStripOffsets = ifdForTag(Tag.STRIP_OFFSETS);
		const ifdStripByteCounts = ifdForTag(Tag.STRIP_BYTE_COUNTS);

		const numStrips = Math.ceil(height / rowsPerStrip);

		const stripByteCounts: number[] = [];
		if (ifdStripByteCounts) {
			for (let i = 0; i < ifdStripByteCounts.count; i++) {
				const type = ifdStripByteCounts.type;
				const offset = ifdStripByteCounts.offset + i * type.bytes;

				let value = 0;
				if (type === Type.SHORT) {
					value = readU16(offset);
				} else if (type === Type.LONG) {
					value = readU32(offset);
				}
				stripByteCounts.push(value);
			}
		}

		const stripOffsets: number[] = [];
		if (ifdStripOffsets) {
			for (let i = 0; i < ifdStripOffsets.count; i++) {
				const type = ifdStripOffsets.type;
				const offset = ifdStripOffsets.offset + i * type.bytes;

				let value = 0;
				if (type === Type.SHORT) {
					value = readU16(offset);
				} else if (type === Type.LONG) {
					value = readU32(offset);
				}
				stripOffsets.push(value);
			}
		}

		const imageBuffer = new Uint8Array(width * height * 3);

		let linesProcessed = 0;
		for (let i = 0; i < numStrips; i++) {
			const stripOffset = stripOffsets[i];
			const stripBytes = stripByteCounts[i];
			const stripData = data.slice(stripOffset, stripOffset + stripBytes);
			const lineBytes = width * 3;
			for (let y = 0; y < rowsPerStrip; y++) {
				const line = stripData.slice(y * lineBytes, y * lineBytes + lineBytes);
				imageBuffer.set(line, linesProcessed * lineBytes);

				if (line.length === lineBytes) {
					linesProcessed++;
				} else {
					break;
				}
			}
		}

		const image = new GeoTIFFImage();
		image.width = width;
		image.height = height;
		image.buffer = imageBuffer;
		image.metadata = ifds;

		return image;
	}
}

export class Exporter {
	static toTiffBuffer(image: { width: number; height: number; buffer: Uint8Array }, params: { ifdEntries?: IFDEntry[] } = {}): { width: number; height: number; buffer: Uint8Array } {
		const offsetToFirstIFD = 8;
		const headerBuffer = new Uint8Array([0x49, 0x49, 42, 0, offsetToFirstIFD, 0, 0, 0]);
		const [width, height] = [image.width, image.height];

		const ifds = [
			new IFDEntry(Tag.IMAGE_WIDTH,                Type.SHORT,    1,   null, width),
			new IFDEntry(Tag.IMAGE_HEIGHT,               Type.SHORT,    1,   null, height),
			new IFDEntry(Tag.BITS_PER_SAMPLE,            Type.SHORT,    4,   null, new Uint16Array([8, 8, 8, 8])),
			new IFDEntry(Tag.COMPRESSION,                Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.PHOTOMETRIC_INTERPRETATION, Type.SHORT,    1,   null, 2),
			new IFDEntry(Tag.ORIENTATION,                Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.SAMPLES_PER_PIXEL,          Type.SHORT,    1,   null, 4),
			new IFDEntry(Tag.ROWS_PER_STRIP,             Type.LONG,     1,   null, height),
			new IFDEntry(Tag.STRIP_BYTE_COUNTS,          Type.LONG,     1,   null, width * height * 3),
			new IFDEntry(Tag.PLANAR_CONFIGURATION,       Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.RESOLUTION_UNIT,            Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.SOFTWARE,                   Type.ASCII,    6,   null, '......'),
			new IFDEntry(Tag.STRIP_OFFSETS,              Type.LONG,     1,   null, null),
			new IFDEntry(Tag.X_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
			new IFDEntry(Tag.Y_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
		];

		if (params.ifdEntries) {
			ifds.push(...params.ifdEntries);
		}

		let valueOffset = offsetToFirstIFD + 2 + ifds.length * 12 + 4;

		const ifdEntryBuffers = new Map<any, ArrayBuffer>();
		const ifdValueBuffers = new Map<any, Uint8Array>();
		for (const ifd of ifds) {
			const entryBuffer = new ArrayBuffer(12);
			const entryView = new DataView(entryBuffer);

			entryView.setUint16(0, ifd.tag.value, true);
			entryView.setUint16(2, ifd.type.value, true);
			entryView.setUint32(4, ifd.count, true);

			if (ifd.count === 1 && ifd.type.bytes <= 4) {
				entryView.setUint32(8, ifd.value, true);
			} else {
				entryView.setUint32(8, valueOffset, true);

				const valueBuffer = new Uint8Array(ifd.count * ifd.type.bytes);
				if (ifd.type === Type.ASCII) {
					valueBuffer.set(new Uint8Array(ifd.value.split('').map((c: string) => c.charCodeAt(0))));
				} else {
					valueBuffer.set(new Uint8Array(ifd.value.buffer));
				}
				ifdValueBuffers.set(ifd.tag, valueBuffer);

				valueOffset = valueOffset + valueBuffer.byteLength;
			}

			ifdEntryBuffers.set(ifd.tag, entryBuffer);
		}

		const imageBufferOffset = valueOffset;
		const stripOffsetBuf = ifdEntryBuffers.get(Tag.STRIP_OFFSETS);
		if (stripOffsetBuf) {
			new DataView(stripOffsetBuf).setUint32(8, imageBufferOffset, true);
		}

		const concatBuffers = (buffers: (ArrayBuffer | ArrayBufferView)[]) => {
			const totalLength = buffers.reduce((sum, b) => (sum + b.byteLength), 0);
			const merged = new Uint8Array(totalLength);
			let offset = 0;
			for (const b of buffers) {
				if (b instanceof ArrayBuffer) {
					merged.set(new Uint8Array(b), offset);
				} else {
					merged.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), offset);
				}
				offset += b.byteLength;
			}
			return merged;
		};

		const ifdBuffer = concatBuffers([
			new Uint16Array([ifds.length]),
			...ifdEntryBuffers.values(),
			new Uint32Array([0])
		]);
		const ifdValueBuffer = concatBuffers([...ifdValueBuffers.values()]);

		const tiffBuffer = concatBuffers([
			headerBuffer,
			ifdBuffer,
			ifdValueBuffer,
			image.buffer
		]);

		return { width, height, buffer: tiffBuffer };
	}
}

export const GeoTIFF = {
	Tag,
	Type,
	IFDEntry,
	Image: GeoTIFFImage,
	Reader,
	Exporter,
};
