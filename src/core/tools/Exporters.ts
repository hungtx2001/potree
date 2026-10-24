import * as THREE from 'three';

export interface ExportablePoint {
	x: number;
	y: number;
	z: number;
	intensity?: number;
	classification?: number;
	color?: [number, number, number];
	mileage?: number;
	returnNumber?: number;
	numberOfReturns?: number;
	pointSourceID?: number;
}

export interface ExportableMeasurement {
	type: string;
	name?: string;
	points: { x: number; y: number; z: number }[];
	closed?: boolean;
	showDistances?: boolean;
	showArea?: boolean;
	edgeLabels?: { position: { x: number; y: number; z: number }; text: string }[];
	areaLabel?: { position: { x: number; y: number; z: number }; text: string };
}

/**
 * Universal CAD, GIS & Point Cloud Data Exporter (Pure TypeScript, Headless, Zero jQuery)
 */
export class Exporters {
	/**
	 * Exports polyline or polygon measurements to standard GeoJSON FeatureCollection
	 */
	static toGeoJSON(objects: (ExportableMeasurement | { type: string; name?: string; points: { x: number; y: number; z: number }[] })[]): string {
		const features: any[] = [];

		for (let idx = 0; idx < objects.length; idx++) {
			const obj = objects[idx];
			const pts = obj.points;
			if (!pts || pts.length === 0) continue;

			if (pts.length === 1) {
				features.push({
					type: 'Feature',
					id: idx + 1,
					properties: {
						name: obj.name || `${obj.type}_${idx + 1}`,
						type: obj.type,
					},
					geometry: {
						type: 'Point',
						coordinates: [pts[0].x, pts[0].y, pts[0].z],
					},
				});
			} else if (obj.type === 'Area' || obj.type === 'Polygon' || (obj as ExportableMeasurement).closed) {
				const ring = pts.map(p => [p.x, p.y, p.z]);
				if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
					ring.push([...ring[0]]);
				}
				features.push({
					type: 'Feature',
					id: idx + 1,
					properties: {
						name: obj.name || `${obj.type}_${idx + 1}`,
						type: obj.type,
					},
					geometry: {
						type: 'Polygon',
						coordinates: [ring],
					},
				});
			} else {
				features.push({
					type: 'Feature',
					id: idx + 1,
					properties: {
						name: obj.name || `${obj.type}_${idx + 1}`,
						type: obj.type,
					},
					geometry: {
						type: 'LineString',
						coordinates: pts.map(p => [p.x, p.y, p.z]),
					},
				});
			}

			// Add measurement labels as Point features if requested
			const m = obj as ExportableMeasurement;
			if (m.showDistances && m.edgeLabels) {
				for (const label of m.edgeLabels) {
					features.push({
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [label.position.x, label.position.y, label.position.z],
						},
						properties: {
							distance: label.text,
							parent: m.name || m.type,
						},
					});
				}
			}

			if (m.showArea && m.areaLabel) {
				features.push({
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [m.areaLabel.position.x, m.areaLabel.position.y, m.areaLabel.position.z],
					},
					properties: {
						area: m.areaLabel.text,
						parent: m.name || m.type,
					},
				});
			}
		}

		return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
	}

	/**
	 * Exports cross-section or point cloud points to CSV
	 */
	static toCSV(points: ExportablePoint[]): string {
		const header = ['Mileage', 'X', 'Y', 'Z', 'Intensity', 'Classification'];
		const rows = points.map(p => [
			p.mileage !== undefined ? p.mileage.toFixed(3) : '0.000',
			p.x.toFixed(3),
			p.y.toFixed(3),
			p.z.toFixed(3),
			p.intensity ?? 0,
			p.classification ?? 0,
		].join(','));

		return [header.join(','), ...rows].join('\n');
	}

	/**
	 * Generates AutoCAD DXF string (Release 12/2000 ASCII format)
	 * Supports raw points, 2D cross sections, and polyline/polygon measurements.
	 */
	static toDXF(
		items: ExportablePoint[] | ExportableMeasurement[],
		options: { mode?: '2d' | '3d'; layerName?: string } = {}
	): string {
		const mode = options.mode || '3d';
		const layer = options.layerName || 'POTREE_DATA';

		let min = new THREE.Vector3(Infinity, Infinity, Infinity);
		let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

		// Calculate bounds
		for (const item of items) {
			if ('points' in item) {
				for (const p of item.points) {
					min.min(p as THREE.Vector3);
					max.max(p as THREE.Vector3);
				}
			} else {
				min.min(item as THREE.Vector3);
				max.max(item as THREE.Vector3);
			}
		}

		if (!isFinite(min.x)) min.set(0, 0, 0);
		if (!isFinite(max.x)) max.set(0, 0, 0);

		const lines: string[] = [
			'999', 'DXF created by Potree Universal Exporter',
			'0', 'SECTION',
			'2', 'HEADER',
			'9', '$ACADVER',
			'1', 'AC1009',
			'9', '$INSBASE',
			'10', '0.0', '20', '0.0', '30', '0.0',
			'9', '$EXTMIN',
			'10', min.x.toFixed(4), '20', min.y.toFixed(4), '30', min.z.toFixed(4),
			'9', '$EXTMAX',
			'10', max.x.toFixed(4), '20', max.y.toFixed(4), '30', max.z.toFixed(4),
			'0', 'ENDSEC',
			'0', 'SECTION',
			'2', 'TABLES',
			'0', 'TABLE',
			'2', 'LAYER',
			'70', '1',
			'0', 'LAYER',
			'2', layer,
			'70', '0',
			'62', '7',
			'6', 'CONTINUOUS',
			'0', 'ENDTAB',
			'0', 'ENDSEC',
			'0', 'SECTION',
			'2', 'ENTITIES',
		];

		for (const item of items) {
			if ('points' in item) {
				// Measurement object (Point, Polyline or Polygon)
				const m = item as ExportableMeasurement;
				if (m.points.length === 1) {
					lines.push('0', 'POINT');
					lines.push('8', layer);
					lines.push('10', m.points[0].x.toFixed(4));
					lines.push('20', m.points[0].y.toFixed(4));
					lines.push('30', m.points[0].z.toFixed(4));
				} else if (m.points.length >= 2) {
					const geomCode = m.closed ? 9 : 8; // Bit 1 = closed polyline
					lines.push('0', 'POLYLINE');
					lines.push('8', layer);
					lines.push('62', '1');
					lines.push('66', '1');
					lines.push('10', '0.0', '20', '0.0', '30', '0.0');
					lines.push('70', geomCode.toString());

					for (const pt of m.points) {
						lines.push('0', 'VERTEX');
						lines.push('8', layer);
						lines.push('10', pt.x.toFixed(4));
						lines.push('20', pt.y.toFixed(4));
						lines.push('30', pt.z.toFixed(4));
						lines.push('70', '32');
					}
					lines.push('0', 'SEQEND');
				}
			} else {
				// Single ExportablePoint
				const p = item as ExportablePoint;
				lines.push('0', 'POINT');
				lines.push('8', layer);
				if (mode === '2d') {
					lines.push('10', (p.mileage !== undefined ? p.mileage : p.x).toFixed(4));
					lines.push('20', p.z.toFixed(4));
					lines.push('30', '0.0');
				} else {
					lines.push('10', p.x.toFixed(4));
					lines.push('20', p.y.toFixed(4));
					lines.push('30', p.z.toFixed(4));
				}
			}
		}

		lines.push('0', 'ENDSEC');
		lines.push('0', 'EOF');

		return lines.join('\n');
	}

	/**
	 * Exports point array to standard ASPRS binary LAS 1.2 format ArrayBuffer
	 */
	static toLAS(points: ExportablePoint[]): ArrayBuffer {
		const numPoints = points.length;
		if (numPoints === 0) {
			return new ArrayBuffer(227);
		}

		let minX = Infinity, minY = Infinity, minZ = Infinity;
		let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

		for (const p of points) {
			if (p.x < minX) minX = p.x;
			if (p.x > maxX) maxX = p.x;
			if (p.y < minY) minY = p.y;
			if (p.y > maxY) maxY = p.y;
			if (p.z < minZ) minZ = p.z;
			if (p.z > maxZ) maxZ = p.z;
		}

		const offsetX = minX;
		const offsetY = minY;
		const offsetZ = minZ;

		const diagonal = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
		const scale = diagonal > 1000000 ? 0.01 : 0.001;

		const headerSize = 227;
		const recordLength = 28; // LAS 1.2 Point Format 2 (with RGB)
		const totalSize = headerSize + recordLength * numPoints;

		const buffer = new ArrayBuffer(totalSize);
		const view = new DataView(buffer);
		const u8View = new Uint8Array(buffer);

		// Helper to write ASCII strings
		const writeString = (str: string, offset: number) => {
			for (let i = 0; i < str.length; i++) {
				u8View[offset + i] = str.charCodeAt(i);
			}
		};

		// 1. Signature 'LASF'
		writeString('LASF', 0);

		// Version 1.2
		u8View[24] = 1;
		u8View[25] = 2;

		// Generating software
		writeString('Potree Universal Engine', 58);

		// Header size (227 bytes)
		view.setUint16(94, headerSize, true);

		// Offset to point data
		view.setUint32(96, headerSize, true);

		// Point data record format 2 (XYZ + Intensity + Returns + Classification + RGB)
		u8View[104] = 2;

		// Point data record length
		view.setUint16(105, recordLength, true);

		// Number of point records
		view.setUint32(107, numPoints, true);

		// Scales
		view.setFloat64(131, scale, true);
		view.setFloat64(139, scale, true);
		view.setFloat64(147, scale, true);

		// Offsets
		view.setFloat64(155, offsetX, true);
		view.setFloat64(163, offsetY, true);
		view.setFloat64(171, offsetZ, true);

		// Max / Min
		view.setFloat64(179, maxX, true);
		view.setFloat64(187, minX, true);
		view.setFloat64(195, maxY, true);
		view.setFloat64(203, minY, true);
		view.setFloat64(211, maxZ, true);
		view.setFloat64(219, minZ, true);

		// Write Point Records
		let offset = headerSize;
		for (let i = 0; i < numPoints; i++) {
			const p = points[i];

			const ux = Math.round((p.x - offsetX) / scale);
			const uy = Math.round((p.y - offsetY) / scale);
			const uz = Math.round((p.z - offsetZ) / scale);

			view.setInt32(offset + 0, ux, true);
			view.setInt32(offset + 4, uy, true);
			view.setInt32(offset + 8, uz, true);

			// Intensity (Uint16)
			view.setUint16(offset + 12, p.intensity ?? 0, true);

			// Return Number & Number of Returns (Bits)
			const retNum = (p.returnNumber ?? 1) & 0x07;
			const numRet = ((p.numberOfReturns ?? 1) & 0x07) << 3;
			u8View[offset + 14] = retNum | numRet;

			// Classification
			u8View[offset + 15] = p.classification ?? 0;

			// Point Source ID
			if (p.pointSourceID !== undefined) {
				view.setUint16(offset + 18, p.pointSourceID, true);
			}

			// RGB Colors (16-bit per channel in LAS standard)
			if (p.color) {
				view.setUint16(offset + 20, Math.round(p.color[0] * 257), true);
				view.setUint16(offset + 22, Math.round(p.color[1] * 257), true);
				view.setUint16(offset + 24, Math.round(p.color[2] * 257), true);
			}

			offset += recordLength;
		}

		return buffer;
	}

	/**
	 * Triggers browser download of a generated text/blob file
	 */
	static downloadFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
		if (typeof document === 'undefined') {
			throw new Error('downloadFile is only available in browser environments.');
		}
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	/**
	 * Triggers browser download of a binary file (ArrayBuffer / Uint8Array)
	 */
	static downloadBinary(filename: string, buffer: ArrayBuffer, mimeType = 'application/octet-stream'): void {
		if (typeof document === 'undefined') {
			throw new Error('downloadBinary is only available in browser environments.');
		}
		const blob = new Blob([buffer], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
}
