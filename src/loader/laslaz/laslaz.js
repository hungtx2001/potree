import {workerPool} from "../../runtime.js";

const pointFormatReaders = {
	0: function(dv) {
		return {
			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
			"intensity": dv.getUint16(12, true),
			"classification": dv.getUint8(16, true)
		};
	},
	1: function(dv) {
		return {
			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
			"intensity": dv.getUint16(12, true),
			"classification": dv.getUint8(16, true)
		};
	},
	2: function(dv) {
		return {
			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
			"intensity": dv.getUint16(12, true),
			"classification": dv.getUint8(16, true),
			"color": [dv.getUint16(20, true), dv.getUint16(22, true), dv.getUint16(24, true)]
		};
	},
	3: function(dv) {
		return {
			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
			"intensity": dv.getUint16(12, true),
			"classification": dv.getUint8(16, true),
			"color": [dv.getUint16(28, true), dv.getUint16(30, true), dv.getUint16(32, true)]
		};
	}
};

function readAs(buf, Type, offset, count = 1) {
	const sub = buf.slice(offset, offset + Type.BYTES_PER_ELEMENT * count);
	const r = new Type(sub);
	if (count === 1) return r[0];
	return Array.from(r);
}

function parseLASHeader(arraybuffer) {
	const o = {};
	o.pointsOffset = readAs(arraybuffer, Uint32Array, 32 * 3);
	o.pointsFormatId = readAs(arraybuffer, Uint8Array, 32 * 3 + 8);
	o.pointsStructSize = readAs(arraybuffer, Uint16Array, 32 * 3 + 8 + 1);
	o.pointsCount = readAs(arraybuffer, Uint32Array, 32 * 3 + 11);

	let start = 32 * 3 + 35;
	o.scale = readAs(arraybuffer, Float64Array, start, 3); start += 24;
	o.offset = readAs(arraybuffer, Float64Array, start, 3); start += 24;

	const bounds = readAs(arraybuffer, Float64Array, start, 6);
	o.maxs = [bounds[0], bounds[2], bounds[4]];
	o.mins = [bounds[1], bounds[3], bounds[5]];

	return o;
}

export class LASLoader {
	constructor(arraybuffer) {
		this.arraybuffer = arraybuffer;
		this.readOffset = 0;
		this.header = null;
	}

	async open() {
		this.readOffset = 0;
	}

	async getHeader() {
		this.header = parseLASHeader(this.arraybuffer);
		return this.header;
	}

	async readData(count, offset, skip) {
		if (!this.header) {
			throw new Error("Cannot start reading data till a header request is issued");
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

	async close() {
		this.arraybuffer = null;
	}
}

export class LAZLoader {
	constructor(arraybuffer) {
		this.arraybuffer = arraybuffer;
		this.ww = null;
		this.nextCB = null;
	}

	dorr(req) {
		if (!this.ww) {
			this.ww = workerPool.getWorker('workers/LASLAZWorker.js');
			this.ww.onmessage = (e) => {
				if (this.nextCB !== null) {
					const cb = this.nextCB;
					this.nextCB = null;
					cb(e.data);
				}
			};
		}
		return new Promise((resolve) => {
			this.nextCB = resolve;
			this.ww.postMessage(req);
		});
	}

	async open() {
		const r = await this.dorr({ type: "open", arraybuffer: this.arraybuffer });
		if (r.status !== 1) throw new Error("Failed to open file");
		return true;
	}

	async getHeader() {
		const r = await this.dorr({ type: "header" });
		if (r.status !== 1) throw new Error("Failed to get header");
		return r.header;
	}

	async readData(count, offset, skip) {
		const r = await this.dorr({ type: "read", count, offset, skip });
		if (r.status !== 1) throw new Error("Failed to read data");
		return {
			buffer: r.buffer,
			count: r.count,
			hasMoreData: r.hasMoreData
		};
	}

	async close() {
		const r = await this.dorr({ type: "close" });
		if (this.ww) {
			workerPool.returnWorker('workers/LASLAZWorker.js', this.ww);
			this.ww = null;
		}
		if (r.status !== 1) throw new Error("Failed to close file");
		return true;
	}
}

export class LASFile {
	constructor(arraybuffer) {
		this.arraybuffer = arraybuffer;
		this.determineVersion();
		if (this.version > 12) {
			throw new Error("Only file versions <= 1.2 are supported at this time");
		}

		this.determineFormat();
		if (pointFormatReaders[this.formatId] === undefined) {
			throw new Error("The point format ID is not supported");
		}

		this.loader = this.isCompressed ? new LAZLoader(this.arraybuffer) : new LASLoader(this.arraybuffer);
	}

	determineFormat() {
		const formatId = readAs(this.arraybuffer, Uint8Array, 32 * 3 + 8);
		const bit_7 = (formatId & 0x80) >> 7;
		const bit_6 = (formatId & 0x40) >> 6;
		if (bit_7 === 1 && bit_6 === 1) {
			throw new Error("Old style compression not supported");
		}
		this.formatId = formatId & 0x3f;
		this.isCompressed = bit_7 === 1 || bit_6 === 1;
	}

	determineVersion() {
		const ver = new Int8Array(this.arraybuffer, 24, 2);
		this.version = ver[0] * 10 + ver[1];
		this.versionAsString = ver[0] + "." + ver[1];
	}

	open() {
		return this.loader.open();
	}

	getHeader() {
		return this.loader.getHeader();
	}

	readData(count, start, skip) {
		return this.loader.readData(count, start, skip);
	}

	close() {
		return this.loader.close();
	}
}

export class LASDecoder {
	constructor(buffer, pointFormatID, pointSize, pointsCount, scale, offset, mins, maxs) {
		this.arrayb = buffer;
		this.decoder = pointFormatReaders[pointFormatID];
		this.pointsCount = pointsCount;
		this.pointSize = pointSize;
		this.scale = scale;
		this.offset = offset;
		this.mins = mins;
		this.maxs = maxs;
	}

	getPoint(index) {
		if (index < 0 || index >= this.pointsCount) {
			throw new Error("Point index out of range");
		}
		const dv = new DataView(this.arrayb, index * this.pointSize, this.pointSize);
		return this.decoder(dv);
	}
}
