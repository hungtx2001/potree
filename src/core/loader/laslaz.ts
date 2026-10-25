import { workerPool } from '../runtime/runtime.js';

export interface LASPoint {
	position: [number, number, number];
	intensity: number;
	classification: number;
	color?: [number, number, number];
}

const pointFormatReaders: Record<number, (dv: DataView) => LASPoint> = {
	0: (dv: DataView) => ({
		position: [dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
		intensity: dv.getUint16(12, true),
		classification: dv.getUint8(16)
	}),
	1: (dv: DataView) => ({
		position: [dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
		intensity: dv.getUint16(12, true),
		classification: dv.getUint8(16)
	}),
	2: (dv: DataView) => ({
		position: [dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
		intensity: dv.getUint16(12, true),
		classification: dv.getUint8(16),
		color: [dv.getUint16(20, true), dv.getUint16(22, true), dv.getUint16(24, true)]
	}),
	3: (dv: DataView) => ({
		position: [dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
		intensity: dv.getUint16(12, true),
		classification: dv.getUint8(16),
		color: [dv.getUint16(28, true), dv.getUint16(30, true), dv.getUint16(32, true)]
	})
};

function readAs(buf: ArrayBuffer, Type: any, offset: number, count: number = 1): any {
	const sub = buf.slice(offset, offset + Type.BYTES_PER_ELEMENT * count);
	const r = new Type(sub);
	if (count === 1) return r[0];
	return Array.from(r);
}

export interface LASHeader {
	pointsOffset: number;
	pointsFormatId: number;
	pointsStructSize: number;
	pointsCount: number;
	scale: [number, number, number];
	offset: [number, number, number];
	maxs: [number, number, number];
	mins: [number, number, number];
	totalRead?: number;
	versionAsString?: string;
	isCompressed?: boolean;
}

function parseLASHeader(arraybuffer: ArrayBuffer): LASHeader {
	const pointsOffset = readAs(arraybuffer, Uint32Array, 32 * 3);
	const pointsFormatId = readAs(arraybuffer, Uint8Array, 32 * 3 + 8);
	const pointsStructSize = readAs(arraybuffer, Uint16Array, 32 * 3 + 8 + 1);
	const pointsCount = readAs(arraybuffer, Uint32Array, 32 * 3 + 11);

	let start = 32 * 3 + 35;
	const scale = readAs(arraybuffer, Float64Array, start, 3);
	start += 24;
	const offset = readAs(arraybuffer, Float64Array, start, 3);
	start += 24;

	const bounds = readAs(arraybuffer, Float64Array, start, 6);
	const maxs: [number, number, number] = [bounds[0], bounds[2], bounds[4]];
	const mins: [number, number, number] = [bounds[1], bounds[3], bounds[5]];

	return {
		pointsOffset,
		pointsFormatId,
		pointsStructSize,
		pointsCount,
		scale,
		offset,
		maxs,
		mins
	};
}

export class LASLoader {
	arraybuffer: ArrayBuffer | null;
	readOffset: number = 0;
	header: LASHeader | null = null;

	constructor(arraybuffer: ArrayBuffer) {
		this.arraybuffer = arraybuffer;
	}

	async open(): Promise<void> {
		this.readOffset = 0;
	}

	async getHeader(): Promise<LASHeader> {
		this.header = parseLASHeader(this.arraybuffer!);
		return this.header;
	}

	async readData(count: number, _offset?: number, skip: number = 1): Promise<{ buffer: ArrayBuffer; count: number; hasMoreData: boolean }> {
		if (!this.header || !this.arraybuffer) {
			throw new Error('Cannot start reading data till a header request is issued');
		}

		if (skip <= 1) {
			count = Math.min(count, this.header.pointsCount - this.readOffset);
			const start = this.header.pointsOffset + this.readOffset * this.header.pointsStructSize;
			const end = start + count * this.header.pointsStructSize;
			const res = {
				buffer: this.arraybuffer.slice(start, end),
				count: count,
				hasMoreData: this.readOffset + count < this.header.pointsCount
			};
			this.readOffset += count;
			return res;
		} else {
			const pointsToRead = Math.min(count * skip, this.header.pointsCount - this.readOffset);
			const bufferSize = Math.ceil(pointsToRead / skip);
			let pointsRead = 0;

			const buf = new Uint8Array(bufferSize * this.header.pointsStructSize);
			for (let i = 0; i < pointsToRead; i++) {
				if (i % skip === 0) {
					const start = this.header.pointsOffset + this.readOffset * this.header.pointsStructSize;
					const src = new Uint8Array(this.arraybuffer, start, this.header.pointsStructSize);
					buf.set(src, pointsRead * this.header.pointsStructSize);
					pointsRead++;
				}
				this.readOffset++;
			}

			return {
				buffer: buf.buffer,
				count: pointsRead,
				hasMoreData: this.readOffset < this.header.pointsCount
			};
		}
	}

	async close(): Promise<void> {
		this.arraybuffer = null;
	}
}

export class LAZLoader {
	arraybuffer: ArrayBuffer;
	ww: Worker | null = null;
	nextCB: ((data: any) => void) | null = null;

	constructor(arraybuffer: ArrayBuffer) {
		this.arraybuffer = arraybuffer;
	}

	dorr(req: any): Promise<any> {
		if (!this.ww) {
			this.ww = workerPool.getWorker('workers/LASLAZWorker.js');
			this.ww.onmessage = (e: MessageEvent) => {
				if (this.nextCB !== null) {
					const cb = this.nextCB;
					this.nextCB = null;
					cb(e.data);
				}
			};
		}
		return new Promise((resolve) => {
			this.nextCB = resolve;
			this.ww!.postMessage(req);
		});
	}

	async open(): Promise<boolean> {
		const r = await this.dorr({ type: 'open', arraybuffer: this.arraybuffer });
		if (r.status !== 1) throw new Error('Failed to open file');
		return true;
	}

	async getHeader(): Promise<LASHeader> {
		const r = await this.dorr({ type: 'header' });
		if (r.status !== 1) throw new Error('Failed to get header');
		return r.header;
	}

	async readData(count: number, offset?: number, skip?: number): Promise<{ buffer: ArrayBuffer; count: number; hasMoreData: boolean }> {
		const r = await this.dorr({ type: 'read', count, offset, skip });
		if (r.status !== 1) throw new Error('Failed to read data');
		return {
			buffer: r.buffer,
			count: r.count,
			hasMoreData: r.hasMoreData
		};
	}

	async close(): Promise<boolean> {
		const r = await this.dorr({ type: 'close' });
		if (this.ww) {
			workerPool.returnWorker('workers/LASLAZWorker.js', this.ww);
			this.ww = null;
		}
		if (r.status !== 1) throw new Error('Failed to close file');
		return true;
	}
}

export class LASFile {
	arraybuffer: ArrayBuffer;
	version: number = 0;
	versionAsString: string = '';
	formatId: number = 0;
	isCompressed: boolean = false;
	loader: LASLoader | LAZLoader;

	constructor(arraybuffer: ArrayBuffer) {
		this.arraybuffer = arraybuffer;
		this.determineVersion();
		if (this.version > 12) {
			throw new Error('Only file versions <= 1.2 are supported at this time');
		}

		this.determineFormat();
		if (pointFormatReaders[this.formatId] === undefined) {
			throw new Error('The point format ID is not supported');
		}

		this.loader = this.isCompressed ? new LAZLoader(this.arraybuffer) : new LASLoader(this.arraybuffer);
	}

	determineFormat(): void {
		const formatId = readAs(this.arraybuffer, Uint8Array, 32 * 3 + 8);
		const bit_7 = (formatId & 0x80) >> 7;
		const bit_6 = (formatId & 0x40) >> 6;
		if (bit_7 === 1 && bit_6 === 1) {
			throw new Error('Old style compression not supported');
		}
		this.formatId = formatId & 0x3f;
		this.isCompressed = bit_7 === 1 || bit_6 === 1;
	}

	determineVersion(): void {
		const ver = new Int8Array(this.arraybuffer, 24, 2);
		this.version = ver[0] * 10 + ver[1];
		this.versionAsString = ver[0] + '.' + ver[1];
	}

	open(): Promise<any> {
		return this.loader.open();
	}

	getHeader(): Promise<LASHeader> {
		return this.loader.getHeader();
	}

	readData(count: number, start?: number, skip?: number): Promise<any> {
		return this.loader.readData(count, start, skip);
	}

	close(): Promise<any> {
		return this.loader.close();
	}
}

export class LASDecoder {
	arrayb: ArrayBuffer;
	decoder: (dv: DataView) => LASPoint;
	pointsCount: number;
	pointSize: number;
	scale: [number, number, number];
	offset: [number, number, number];
	mins: [number, number, number];
	maxs: [number, number, number];

	constructor(
		buffer: ArrayBuffer,
		pointFormatID: number,
		pointSize: number,
		pointsCount: number,
		scale: [number, number, number],
		offset: [number, number, number],
		mins: [number, number, number],
		maxs: [number, number, number]
	) {
		this.arrayb = buffer;
		this.decoder = pointFormatReaders[pointFormatID] || pointFormatReaders[0];
		this.pointsCount = pointsCount;
		this.pointSize = pointSize;
		this.scale = scale;
		this.offset = offset;
		this.mins = mins;
		this.maxs = maxs;
	}

	getPoint(index: number): LASPoint {
		if (index < 0 || index >= this.pointsCount) {
			throw new Error('Point index out of range');
		}
		const dv = new DataView(this.arrayb, index * this.pointSize, this.pointSize);
		return this.decoder(dv);
	}
}
