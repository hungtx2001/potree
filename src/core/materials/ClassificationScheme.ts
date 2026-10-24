import * as THREE from 'three';

export interface ClassificationEntry {
	visible: boolean;
	name: string;
	color: THREE.Vector4;
}

export class ClassificationScheme {
	static readonly DEFAULT: Record<number, ClassificationEntry> = {
		0:  { visible: true, name: 'never classified',      color: new THREE.Vector4(0.5, 0.5, 0.5, 1.0) },
		1:  { visible: true, name: 'unclassified',            color: new THREE.Vector4(0.5, 0.5, 0.5, 1.0) },
		2:  { visible: true, name: 'ground',                  color: new THREE.Vector4(0.63, 0.32, 0.18, 1.0) },
		3:  { visible: true, name: 'low vegetation',          color: new THREE.Vector4(0.0, 1.0, 0.0, 1.0) },
		4:  { visible: true, name: 'medium vegetation',       color: new THREE.Vector4(0.0, 0.8, 0.0, 1.0) },
		5:  { visible: true, name: 'high vegetation',         color: new THREE.Vector4(0.0, 0.6, 0.0, 1.0) },
		6:  { visible: true, name: 'building',                color: new THREE.Vector4(1.0, 0.66, 0.0, 1.0) },
		7:  { visible: true, name: 'low point(noise)',        color: new THREE.Vector4(1.0, 0.0, 1.0, 1.0) },
		8:  { visible: true, name: 'model key-point',         color: new THREE.Vector4(1.0, 0.0, 0.0, 1.0) },
		9:  { visible: true, name: 'water',                   color: new THREE.Vector4(0.0, 0.0, 1.0, 1.0) },
		12: { visible: true, name: 'overlap',                 color: new THREE.Vector4(1.0, 1.0, 0.0, 1.0) },
		13: { visible: true, name: 'wire - guard',            color: new THREE.Vector4(0.0, 1.0, 1.0, 1.0) },
		14: { visible: true, name: 'wire - conductor',        color: new THREE.Vector4(1.0, 1.0, 0.0, 1.0) },
		15: { visible: true, name: 'transmission tower',      color: new THREE.Vector4(0.4, 0.4, 0.4, 1.0) },
		16: { visible: true, name: 'wire - connector',        color: new THREE.Vector4(0.0, 0.5, 1.0, 1.0) },
		17: { visible: true, name: 'bridge deck',             color: new THREE.Vector4(0.5, 0.3, 0.0, 1.0) },
		18: { visible: true, name: 'high noise',              color: new THREE.Vector4(0.0, 0.0, 0.0, 1.0) },
	};

	static generateTexture(scheme: Record<number, ClassificationEntry> = ClassificationScheme.DEFAULT): THREE.DataTexture {
		const width = 256;
		const data = new Uint8Array(width * 4);

		// Default white for unspecified classifications
		for (let i = 0; i < width * 4; i += 4) {
			data[i] = 255;
			data[i + 1] = 255;
			data[i + 2] = 255;
			data[i + 3] = 255;
		}

		for (const [key, entry] of Object.entries(scheme)) {
			const index = parseInt(key, 10);
			if (index >= 0 && index < width) {
				const offset = index * 4;
				if (entry.visible) {
					data[offset] = Math.round(entry.color.x * 255);
					data[offset + 1] = Math.round(entry.color.y * 255);
					data[offset + 2] = Math.round(entry.color.z * 255);
					data[offset + 3] = Math.round(entry.color.w * 255);
				} else {
					data[offset + 3] = 0; // Transparent / invisible
				}
			}
		}

		const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
		texture.minFilter = THREE.NearestFilter;
		texture.magFilter = THREE.NearestFilter;
		texture.needsUpdate = true;

		return texture;
	}
}

export const generateClassificationTexture = ClassificationScheme.generateTexture;
