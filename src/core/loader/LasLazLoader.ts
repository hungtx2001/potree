import * as THREE from 'three';
import { Version } from '../utils/Version.js';
import { XHRFactory } from '../utils/XHRFactory.js';
import { workerPool, runtime } from '../runtime/runtime.js';

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

export class LasLazBatcher {
	node: any;

	constructor(node: any) {
		this.node = node;
	}

	push(lasBuffer: any): void {
		const workerPath = runtime.scriptPath + '/workers/LASDecoderWorker.js';
		const worker = workerPool.getWorker(workerPath);
		const node = this.node;
		const pointAttributes = node.pcoGeometry.pointAttributes;

		worker.onmessage = (e: MessageEvent) => {
			const geometry = new THREE.BufferGeometry();
			const numPoints = lasBuffer.pointsCount;

			const positions = new Float32Array(e.data.position);
			const colors = new Uint8Array(e.data.color);
			const intensities = new Float32Array(e.data.intensity);
			const classifications = new Uint8Array(e.data.classification);
			const returnNumbers = new Uint8Array(e.data.returnNumber);
			const numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			const pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			const indices = new Uint8Array(e.data.indices);

			geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4, true));
			geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			geometry.setAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			geometry.setAttribute('return number', new THREE.BufferAttribute(returnNumbers, 1));
			geometry.setAttribute('number of returns', new THREE.BufferAttribute(numberOfReturns, 1));
			geometry.setAttribute('source id', new THREE.BufferAttribute(pointSourceIDs, 1));
			geometry.setAttribute('indices', new THREE.BufferAttribute(indices, 4, true));

			for (const key in e.data.ranges) {
				const range = e.data.ranges[key];
				const attribute = pointAttributes.attributes.find((a: any) => a.name === key);
				if (attribute && attribute.range) {
					attribute.range[0] = Math.min(attribute.range[0], range[0]);
					attribute.range[1] = Math.max(attribute.range[1], range[1]);
				}
			}

			const tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			geometry.boundingBox = this.node.boundingBox;
			this.node.tightBoundingBox = tightBoundingBox;

			this.node.geometry = geometry;
			this.node.numPoints = numPoints;
			this.node.loaded = true;
			this.node.loading = false;
			runtime.numNodesLoading--;
			this.node.pcoGeometry.numNodesLoading--;

			workerPool.returnWorker(workerPath, worker);
		};

		const message = {
			buffer: lasBuffer.buffer,
			numPoints: lasBuffer.pointsCount,
			pointSize: lasBuffer.pointSize,
			pointFormatID: lasBuffer.pointFormatID,
			scale: lasBuffer.scale,
			offset: lasBuffer.offset,
			pointAttributes: pointAttributes
		};

		worker.postMessage(message, [message.buffer]);
	}
}

export class LasLazLoader {
	version: Version;

	constructor(version: string) {
		if (typeof version === 'string') {
			this.version = new Version(version);
		} else {
			this.version = version;
		}
	}

	static progressCB = (_progress: number) => {};

	load(node: any): void {
		if (node.loaded) return;

		const url = node.pcoGeometry.url + '/' + node.name;
		const xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');

		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					const buffer = xhr.response;
					this.parse(node, buffer);
				} else {
					console.error(`Failed to load ${url}: ${xhr.status}`);
				}
			}
		};

		xhr.send(null);
	}

	async parse(node: any, buffer: ArrayBuffer): Promise<void> {
		const lf = new LASFile(buffer);
		const handler = new LasLazBatcher(node);

		await lf.open();
		const header = await lf.getHeader();

		const skip = 1;
		let totalRead = 0;
		const totalToRead = skip <= 1 ? header.pointsCount : header.pointsCount / skip;
		let hasMoreData = true;

		while (hasMoreData) {
			const data = await lf.readData(1000 * 1000, 0, skip);

			handler.push(
				new LASDecoder(
					data.buffer,
					header.pointsFormatId,
					header.pointsStructSize,
					data.count,
					header.scale,
					header.offset,
					header.mins,
					header.maxs
				)
			);

			totalRead += data.count;
			LasLazLoader.progressCB(totalRead / totalToRead);
			hasMoreData = data.hasMoreData;
		}

		header.totalRead = totalRead;
		header.versionAsString = lf.versionAsString;
		header.isCompressed = lf.isCompressed;

		LasLazLoader.progressCB(1);

		try {
			await lf.close();
		} catch (e) {
			console.error('failed to close las/laz file!!!');
			throw e;
		}
	}
}
