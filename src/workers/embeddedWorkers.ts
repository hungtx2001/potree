/**
 * Self-contained in-memory Blob Worker factories for Potree
 * Enables 100% Zero-Config / Zero-404 / Offline / Cross-Origin point cloud decoding
 */

const DECODER_WORKER_CODE = `
const typedArrayMapping = {
	"int8":   Int8Array,
	"int16":  Int16Array,
	"int32":  Int32Array,
	"int64":  Float64Array,
	"uint8":  Uint8Array,
	"uint16": Uint16Array,
	"uint32": Uint32Array,
	"uint64": Float64Array,
	"float":  Float32Array,
	"double": Float64Array,
};

self.onmessage = function (event) {
	let {buffer, pointAttributes, scale, name, min, max, size, offset, numPoints} = event.data;
	let view = new DataView(buffer);
	let attributeBuffers = {};
	let attributeOffset = 0;

	let bytesPerPoint = 0;
	for (let pointAttribute of pointAttributes.attributes) {
		bytesPerPoint += pointAttribute.byteSize;
	}

	let gridSize = 32;
	let grid = new Uint32Array(gridSize ** 3);
	let toIndex = (x, y, z) => {
		let dx = gridSize * x / size.x;
		let dy = gridSize * y / size.y;
		let dz = gridSize * z / size.z;
		let ix = Math.min(parseInt(dx), gridSize - 1);
		let iy = Math.min(parseInt(dy), gridSize - 1);
		let iz = Math.min(parseInt(dz), gridSize - 1);
		return ix + iy * gridSize + iz * gridSize * gridSize;
	};

	let numOccupiedCells = 0;
	for (let pointAttribute of pointAttributes.attributes) {
		if(["POSITION_CARTESIAN", "position"].includes(pointAttribute.name)){
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let positions = new Float32Array(buff);
			for (let j = 0; j < numPoints; j++) {
				let pointOffset = j * bytesPerPoint;
				let x = (view.getInt32(pointOffset + attributeOffset + 0, true) * scale[0]) + offset[0] - min.x;
				let y = (view.getInt32(pointOffset + attributeOffset + 4, true) * scale[1]) + offset[1] - min.y;
				let z = (view.getInt32(pointOffset + attributeOffset + 8, true) * scale[2]) + offset[2] - min.z;
				let index = toIndex(x, y, z);
				if (grid[index]++ === 0) numOccupiedCells++;
				positions[3 * j + 0] = x;
				positions[3 * j + 1] = y;
				positions[3 * j + 2] = z;
			}
			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if(["RGBA", "rgba"].includes(pointAttribute.name)){
			let buff = new ArrayBuffer(numPoints * 4);
			let colors = new Uint8Array(buff);
			for (let j = 0; j < numPoints; j++) {
				let pointOffset = j * bytesPerPoint;
				let r = view.getUint16(pointOffset + attributeOffset + 0, true);
				let g = view.getUint16(pointOffset + attributeOffset + 2, true);
				let b = view.getUint16(pointOffset + attributeOffset + 4, true);
				colors[4 * j + 0] = r > 255 ? r / 256 : r;
				colors[4 * j + 1] = g > 255 ? g / 256 : g;
				colors[4 * j + 2] = b > 255 ? b / 256 : b;
			}
			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else {
			let buff = new ArrayBuffer(numPoints * 4);
			let f32 = new Float32Array(buff);
			let TypedArray = typedArrayMapping[pointAttribute.type.name] || Float32Array;
			let preciseBuffer = new TypedArray(numPoints);
			let [attrOffset, attrScale] = [0, 1];
			const getterMap = {
				"int8": view.getInt8,
				"int16": view.getInt16,
				"int32": view.getInt32,
				"uint8": view.getUint8,
				"uint16": view.getUint16,
				"uint32": view.getUint32,
				"float": view.getFloat32,
				"double": view.getFloat64,
			};
			const getter = (getterMap[pointAttribute.type.name] || view.getFloat32).bind(view);
			if (pointAttribute.type.size > 4 && pointAttribute.range) {
				let [amin, amax] = pointAttribute.range;
				attrOffset = amin;
				attrScale = 1 / (amax - amin);
			}
			for (let j = 0; j < numPoints; j++) {
				let pointOffset = j * bytesPerPoint;
				let value = getter(pointOffset + attributeOffset, true);
				f32[j] = (value - attrOffset) * attrScale;
				preciseBuffer[j] = value;
			}
			attributeBuffers[pointAttribute.name] = { 
				buffer: buff,
				preciseBuffer: preciseBuffer,
				attribute: pointAttribute,
				offset: attrOffset,
				scale: attrScale,
			};
		}
		attributeOffset += pointAttribute.byteSize;
	}

	let occupancy = parseInt(numPoints / Math.max(1, numOccupiedCells));
	{
		let buff = new ArrayBuffer(numPoints * 4);
		let indices = new Uint32Array(buff);
		for (let i = 0; i < numPoints; i++) indices[i] = i;
		attributeBuffers["INDICES"] = { buffer: buff, attribute: { name: "INDICES", byteSize: 4 } };
	}

	if (pointAttributes.vectors) {
		for (let vector of pointAttributes.vectors) {
			let {name: vecName, attributes: vecAttrs} = vector;
			let numVectorElements = vecAttrs.length;
			let bufferVec = new ArrayBuffer(numVectorElements * numPoints * 4);
			let f32 = new Float32Array(bufferVec);
			let iElement = 0;
			for (let sourceName of vecAttrs) {
				let sourceBuffer = attributeBuffers[sourceName];
				if (!sourceBuffer) continue;
				let {offset: sOffset, scale: sScale} = sourceBuffer;
				let viewVec = new DataView(sourceBuffer.buffer);
				for (let j = 0; j < numPoints; j++) {
					let val = viewVec.getFloat32(j * 4, true);
					f32[j * numVectorElements + iElement] = (val / sScale) + sOffset;
				}
				iElement++;
			}
			attributeBuffers[vecName] = { 
				buffer: bufferVec, 
				attribute: { name: vecName, type: { ordinal: 1, name: "float", size: 4 }, numElements: numVectorElements, byteSize: numVectorElements * 4 },
			};
		}
	}

	let message = {
		buffer: buffer,
		attributeBuffers: attributeBuffers,
		density: occupancy,
	};
	let transferables = [];
	for (let prop in message.attributeBuffers) {
		transferables.push(message.attributeBuffers[prop].buffer);
	}
	transferables.push(buffer);
	self.postMessage(message, transferables);
};
`;

let decoderBlobUrl: string | null = null;

export function createBlobDecoderWorker(): Worker | null {
	if (typeof window === 'undefined' || typeof Blob === 'undefined' || typeof Worker === 'undefined') {
		return null;
	}
	try {
		if (!decoderBlobUrl) {
			const blob = new Blob([DECODER_WORKER_CODE], { type: 'application/javascript' });
			decoderBlobUrl = URL.createObjectURL(blob);
		}
		return new Worker(decoderBlobUrl);
	} catch (e) {
		console.warn('[Potree] Could not create Blob worker fallback:', e);
		return null;
	}
}
