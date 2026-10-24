import * as THREE from 'three';

export interface MeasurementPoint {
	x: number;
	y: number;
	z: number;
}

export interface DistanceResult {
	total: number;
	segments: number[];
	horizontal: number;
	vertical: number;
}

export interface AreaResult {
	area: number;
	perimeter: number;
}

export interface AngleResult {
	degrees: number;
	radians: number;
}

export interface VolumeResult {
	volume: number;
	box: {
		width: number;
		height: number;
		depth: number;
	};
}

/**
 * Headless Spatial Measurement Engine (100% Pure Math & Vector Geometry)
 * Zero DOM, Zero jQuery. Used by both 3D Viewport and React UI.
 */
export class MeasurementEngine {
	/**
	 * Computes 3D euclidean distance between sequential polyline points
	 */
	static computeDistance(points: (THREE.Vector3 | MeasurementPoint)[]): DistanceResult {
		if (points.length < 2) {
			return { total: 0, segments: [], horizontal: 0, vertical: 0 };
		}

		let total = 0;
		const segments: number[] = [];

		for (let i = 0; i < points.length - 1; i++) {
			const p1 = points[i];
			const p2 = points[i + 1];
			const dx = p2.x - p1.x;
			const dy = p2.y - p1.y;
			const dz = p2.z - p1.z;
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
			segments.push(dist);
			total += dist;
		}

		const first = points[0];
		const last = points[points.length - 1];
		const hDx = last.x - first.x;
		const hDy = last.y - first.y;
		const horizontal = Math.sqrt(hDx * hDx + hDy * hDy);
		const vertical = Math.abs(last.z - first.z);

		return { total, segments, horizontal, vertical };
	}

	/**
	 * Computes area and perimeter of a 3D polygon using Newell's method
	 */
	static computeArea(points: (THREE.Vector3 | MeasurementPoint)[]): AreaResult {
		if (points.length < 3) {
			return { area: 0, perimeter: 0 };
		}

		let normal = new THREE.Vector3(0, 0, 0);
		for (let i = 0; i < points.length; i++) {
			const current = points[i];
			const next = points[(i + 1) % points.length];
			normal.x += (current.y - next.y) * (current.z + next.z);
			normal.y += (current.z - next.z) * (current.x + next.x);
			normal.z += (current.x - next.x) * (current.y + next.y);
		}

		const area = normal.length() * 0.5;

		// Compute perimeter
		let perimeter = 0;
		for (let i = 0; i < points.length; i++) {
			const current = points[i];
			const next = points[(i + 1) % points.length];
			const dx = next.x - current.x;
			const dy = next.y - current.y;
			const dz = next.z - current.z;
			perimeter += Math.sqrt(dx * dx + dy * dy + dz * dz);
		}

		return { area, perimeter };
	}

	/**
	 * Computes angle at vertex B formed by rays BA and BC
	 */
	static computeAngle(
		a: THREE.Vector3 | MeasurementPoint,
		b: THREE.Vector3 | MeasurementPoint,
		c: THREE.Vector3 | MeasurementPoint
	): AngleResult {
		const vBA = new THREE.Vector3(a.x - b.x, a.y - b.y, a.z - b.z).normalize();
		const vBC = new THREE.Vector3(c.x - b.x, c.y - b.y, c.z - b.z).normalize();

		const dot = Math.max(-1, Math.min(1, vBA.dot(vBC)));
		const radians = Math.acos(dot);
		const degrees = (radians * 180) / Math.PI;

		return { degrees, radians };
	}

	/**
	 * Computes volume of a 3D axis-aligned or oriented bounding box
	 */
	static computeBoxVolume(size: THREE.Vector3 | { x: number; y: number; z: number }): VolumeResult {
		const width = Math.abs(size.x);
		const height = Math.abs(size.y);
		const depth = Math.abs(size.z);
		const volume = width * height * depth;

		return {
			volume,
			box: { width, height, depth },
		};
	}
}
