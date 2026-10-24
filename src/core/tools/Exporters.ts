import * as THREE from 'three';

export interface ExportablePoint {
	x: number;
	y: number;
	z: number;
	intensity?: number;
	classification?: number;
	color?: [number, number, number];
	mileage?: number;
}

/**
 * Universal CAD, GIS & Data Exporter (Pure TypeScript, Zero DOM)
 */
export class Exporters {
	/**
	 * Exports polyline or polygon measurements to standard GeoJSON FeatureCollection
	 */
	static toGeoJSON(objects: { type: string; name?: string; points: { x: number; y: number; z: number }[] }[]): string {
		const features = objects.map((obj, idx) => {
			let geometry: any;
			if (obj.points.length === 1) {
				geometry = {
					type: 'Point',
					coordinates: [obj.points[0].x, obj.points[0].y, obj.points[0].z],
				};
			} else if (obj.type === 'Area' || obj.type === 'Polygon') {
				const ring = obj.points.map(p => [p.x, p.y, p.z]);
				// Close the polygon ring if not closed
				if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
					ring.push([...ring[0]]);
				}
				geometry = {
					type: 'Polygon',
					coordinates: [ring],
				};
			} else {
				geometry = {
					type: 'LineString',
					coordinates: obj.points.map(p => [p.x, p.y, p.z]),
				};
			}

			return {
				type: 'Feature',
				id: idx + 1,
				properties: {
					name: obj.name || `${obj.type}_${idx + 1}`,
					type: obj.type,
				},
				geometry,
			};
		});

		return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
	}

	/**
	 * Exports cross-section or point cloud points to CSV
	 */
	static toCSV(points: ExportablePoint[]): string {
		const header = ['Mileage', 'X', 'Y', 'Z', 'Intensity', 'Classification'];
		const rows = points.map(p => [
			p.mileage?.toFixed(3) ?? '0.000',
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
	 */
	static toDXF(
		points: ExportablePoint[],
		options: { mode: '2d' | '3d'; layerName?: string } = { mode: '3d' }
	): string {
		const layer = options.layerName || 'POINTCLOUD';
		const lines: string[] = [
			'0', 'SECTION',
			'2', 'HEADER',
			'9', '$ACADVER',
			'1', 'AC1009',
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

		for (const p of points) {
			lines.push('0', 'POINT');
			lines.push('8', layer);
			if (options.mode === '2d') {
				lines.push('10', (p.mileage || p.x).toFixed(4));
				lines.push('20', p.z.toFixed(4));
				lines.push('30', '0.0');
			} else {
				lines.push('10', p.x.toFixed(4));
				lines.push('20', p.y.toFixed(4));
				lines.push('30', p.z.toFixed(4));
			}
		}

		lines.push('0', 'ENDSEC');
		lines.push('0', 'EOF');

		return lines.join('\n');
	}

	/**
	 * Triggers browser download of a generated text/blob file
	 */
	static downloadFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
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
}
