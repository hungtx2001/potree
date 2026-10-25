export function parseEpt(event: any): void {
	const buffer = event.data.buffer;
	const view = new DataView(buffer);
	const schema = event.data.schema;
	const scale = event.data.scale;
	const offset = event.data.offset;
	const mins = event.data.mins;

	const dimensions = schema.reduce((p: any, c: any) => {
		p[c.name] = c;
		return p;
	}, {});

	const dimOffset = (name: string): number | undefined => {
		let off = 0;
		for (let i = 0; i < schema.length; ++i) {
			if (schema[i].name === name) return off;
			off += schema[i].size;
		}
		return undefined;
	};

	const getExtractor = (name: string): ((p: number) => number) => {
		const off = dimOffset(name);
		if (off === undefined) throw new Error(`Missing dimension ${name}`);
		const type = dimensions[name].type;
		const size = dimensions[name].size;

		if (type === 'signed') {
			switch (size) {
				case 1:
					return (p: number) => view.getInt8(p + off);
				case 2:
					return (p: number) => view.getInt16(p + off, true);
				case 4:
					return (p: number) => view.getInt32(p + off, true);
				case 8:
					return (p: number) => Number(view.getBigInt64(p + off, true));
			}
		}
		if (type === 'unsigned') {
			switch (size) {
				case 1:
					return (p: number) => view.getUint8(p + off);
				case 2:
					return (p: number) => view.getUint16(p + off, true);
				case 4:
					return (p: number) => view.getUint32(p + off, true);
				case 8:
					return (p: number) => Number(view.getBigUint64(p + off, true));
			}
		}
		if (type === 'float') {
			switch (size) {
				case 4:
					return (p: number) => view.getFloat32(p + off, true);
				case 8:
					return (p: number) => view.getFloat64(p + off, true);
			}
		}

		const str = JSON.stringify(dimensions[name]);
		throw new Error(`Invalid dimension specification for ${name}: ${str}`);
	};

	const pointSize = schema.reduce((p: number, c: any) => p + c.size, 0);
	const numPoints = Math.floor(buffer.byteLength / pointSize);

	let xyzBuffer: ArrayBuffer | undefined;
	let rgbBuffer: ArrayBuffer | undefined;
	let intensityBuffer: ArrayBuffer | undefined;
	let classificationBuffer: ArrayBuffer | undefined;
	let returnNumberBuffer: ArrayBuffer | undefined;
	let numberOfReturnsBuffer: ArrayBuffer | undefined;
	let pointSourceIdBuffer: ArrayBuffer | undefined;

	let xyz: Float32Array | undefined;
	let rgb: Uint8Array | undefined;
	let intensity: Float32Array | undefined;
	let classification: Uint8Array | undefined;
	let returnNumber: Uint8Array | undefined;
	let numberOfReturns: Uint8Array | undefined;
	let pointSourceId: Uint16Array | undefined;

	let xyzExtractor: Array<(p: number) => number> | undefined;
	let rgbExtractor: Array<(p: number) => number> | undefined;
	let intensityExtractor: ((p: number) => number) | undefined;
	let classificationExtractor: ((p: number) => number) | undefined;
	let returnNumberExtractor: ((p: number) => number) | undefined;
	let numberOfReturnsExtractor: ((p: number) => number) | undefined;
	let pointSourceIdExtractor: ((p: number) => number) | undefined;
	let twoByteColor = false;

	if (dimensions['X'] && dimensions['Y'] && dimensions['Z']) {
		xyzBuffer = new ArrayBuffer(numPoints * 4 * 3);
		xyz = new Float32Array(xyzBuffer);
		xyzExtractor = [getExtractor('X'), getExtractor('Y'), getExtractor('Z')];
	}

	if (dimensions['Red'] && dimensions['Green'] && dimensions['Blue']) {
		rgbBuffer = new ArrayBuffer(numPoints * 4);
		rgb = new Uint8Array(rgbBuffer);
		rgbExtractor = [getExtractor('Red'), getExtractor('Green'), getExtractor('Blue')];

		for (let i = 0; i < numPoints && !twoByteColor; ++i) {
			const pos = i * pointSize;
			const r = rgbExtractor[0](pos);
			const g = rgbExtractor[1](pos);
			const b = rgbExtractor[2](pos);
			if (r > 255 || g > 255 || b > 255) twoByteColor = true;
		}
	}

	if (dimensions['Intensity']) {
		intensityBuffer = new ArrayBuffer(numPoints * 4);
		intensity = new Float32Array(intensityBuffer);
		intensityExtractor = getExtractor('Intensity');
	}

	if (dimensions['Classification']) {
		classificationBuffer = new ArrayBuffer(numPoints);
		classification = new Uint8Array(classificationBuffer);
		classificationExtractor = getExtractor('Classification');
	}

	if (dimensions['ReturnNumber']) {
		returnNumberBuffer = new ArrayBuffer(numPoints);
		returnNumber = new Uint8Array(returnNumberBuffer);
		returnNumberExtractor = getExtractor('ReturnNumber');
	}

	if (dimensions['NumberOfReturns']) {
		numberOfReturnsBuffer = new ArrayBuffer(numPoints);
		numberOfReturns = new Uint8Array(numberOfReturnsBuffer);
		numberOfReturnsExtractor = getExtractor('NumberOfReturns');
	}

	if (dimensions['PointSourceId']) {
		pointSourceIdBuffer = new ArrayBuffer(numPoints * 2);
		pointSourceId = new Uint16Array(pointSourceIdBuffer);
		pointSourceIdExtractor = getExtractor('PointSourceId');
	}

	const mean = [0, 0, 0];
	const bounds = {
		min: [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE],
		max: [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]
	};

	for (let i = 0; i < numPoints; ++i) {
		const pos = i * pointSize;
		if (xyz && xyzExtractor) {
			const x = xyzExtractor[0](pos) * scale.x + offset.x - mins[0];
			const y = xyzExtractor[1](pos) * scale.y + offset.y - mins[1];
			const z = xyzExtractor[2](pos) * scale.z + offset.z - mins[2];

			mean[0] += x / numPoints;
			mean[1] += y / numPoints;
			mean[2] += z / numPoints;

			bounds.min[0] = Math.min(bounds.min[0], x);
			bounds.min[1] = Math.min(bounds.min[1], y);
			bounds.min[2] = Math.min(bounds.min[2], z);

			bounds.max[0] = Math.max(bounds.max[0], x);
			bounds.max[1] = Math.max(bounds.max[1], y);
			bounds.max[2] = Math.max(bounds.max[2], z);

			xyz[3 * i + 0] = x;
			xyz[3 * i + 1] = y;
			xyz[3 * i + 2] = z;
		}

		if (rgb && rgbExtractor) {
			let r = rgbExtractor[0](pos);
			let g = rgbExtractor[1](pos);
			let b = rgbExtractor[2](pos);

			if (twoByteColor) {
				r = Math.floor(r / 256);
				g = Math.floor(g / 256);
				b = Math.floor(b / 256);
			}

			rgb[4 * i + 0] = r;
			rgb[4 * i + 1] = g;
			rgb[4 * i + 2] = b;
			rgb[4 * i + 3] = 255;
		}

		if (intensity && intensityExtractor) intensity[i] = intensityExtractor(pos);
		if (classification && classificationExtractor) classification[i] = classificationExtractor(pos);
		if (returnNumber && returnNumberExtractor) returnNumber[i] = returnNumberExtractor(pos);
		if (numberOfReturns && numberOfReturnsExtractor) numberOfReturns[i] = numberOfReturnsExtractor(pos);
		if (pointSourceId && pointSourceIdExtractor) pointSourceId[i] = pointSourceIdExtractor(pos);
	}

	const indicesBuffer = new ArrayBuffer(numPoints * 4);
	const indices = new Uint32Array(indicesBuffer);
	for (let i = 0; i < numPoints; ++i) {
		indices[i] = i;
	}

	const message: any = {
		numPoints: numPoints,
		tightBoundingBox: bounds,
		mean: mean,
		position: xyzBuffer,
		color: rgbBuffer,
		intensity: intensityBuffer,
		classification: classificationBuffer,
		returnNumber: returnNumberBuffer,
		numberOfReturns: numberOfReturnsBuffer,
		pointSourceId: pointSourceIdBuffer,
		indices: indicesBuffer
	};

	const transferables = [
		message.position,
		message.color,
		message.intensity,
		message.classification,
		message.returnNumber,
		message.numberOfReturns,
		message.pointSourceId,
		message.indices
	].filter(Boolean);

	if (typeof postMessage !== 'undefined') {
		(postMessage as any)(message, transferables);
	}
}
