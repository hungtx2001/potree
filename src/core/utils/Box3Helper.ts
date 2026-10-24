import * as THREE from 'three';

export class Box3Helper extends THREE.LineSegments {
	public box: THREE.Box3;

	constructor(box: THREE.Box3, color: number | string | THREE.Color = 0xffff00) {
		const indices = new Uint16Array([
			0, 1, 1, 2, 2, 3, 3, 0,
			4, 5, 5, 6, 6, 7, 7, 4,
			0, 4, 1, 5, 2, 6, 3, 7
		]);

		const positions = new Float32Array([
			box.min.x, box.min.y, box.min.z,
			box.max.x, box.min.y, box.min.z,
			box.max.x, box.min.y, box.max.z,
			box.min.x, box.min.y, box.max.z,
			box.min.x, box.max.y, box.min.z,
			box.max.x, box.max.y, box.min.z,
			box.max.x, box.max.y, box.max.z,
			box.min.x, box.max.y, box.max.z
		]);

		const geometry = new THREE.BufferGeometry();
		geometry.setIndex(new THREE.BufferAttribute(indices, 1));
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		const material = new THREE.LineBasicMaterial({ color });

		super(geometry, material);
		this.box = box;
	}

	updateMatrixWorld(force?: boolean): void {
		const box = this.box;
		if (box.isEmpty()) return;

		const geom = this.geometry as THREE.BufferGeometry;
		const position = geom.attributes.position as THREE.BufferAttribute;
		const array = position.array as Float32Array;

		array[0] = box.min.x; array[1] = box.min.y; array[2] = box.min.z;
		array[3] = box.max.x; array[4] = box.min.y; array[5] = box.min.z;
		array[6] = box.max.x; array[7] = box.min.y; array[8] = box.max.z;
		array[9] = box.min.x; array[10] = box.min.y; array[11] = box.max.z;
		array[12] = box.min.x; array[13] = box.max.y; array[14] = box.min.z;
		array[15] = box.max.x; array[16] = box.max.y; array[17] = box.min.z;
		array[18] = box.max.x; array[19] = box.max.y; array[20] = box.max.z;
		array[21] = box.min.x; array[22] = box.max.y; array[23] = box.max.z;

		position.needsUpdate = true;
		this.geometry.computeBoundingSphere();

		super.updateMatrixWorld(force);
	}
}
