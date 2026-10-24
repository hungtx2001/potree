import * as THREE from 'three';

export class SpotLightHelper extends THREE.Object3D {
	public light: THREE.SpotLight;
	public color?: number | string | THREE.Color;
	public sphere: THREE.Mesh;
	public frustum: THREE.LineSegments;

	constructor(light: THREE.SpotLight, color?: number | string | THREE.Color) {
		super();

		this.light = light;
		this.color = color;

		this.updateMatrix();
		this.updateMatrixWorld();

		{ // Sphere indicator at position
			const sg = new THREE.SphereGeometry(1, 32, 32);
			const sm = new THREE.MeshNormalMaterial();
			this.sphere = new THREE.Mesh(sg, sm);
			this.sphere.scale.set(0.5, 0.5, 0.5);
			this.add(this.sphere);
		}

		{ // Frustum indicator lines
			const positions = new Float32Array([
				+0, +0, +0,     +0, +0, -1,

				+0, +0, +0,     -1, -1, -1,
				+0, +0, +0,     +1, -1, -1,
				+0, +0, +0,     +1, +1, -1,
				+0, +0, +0,     -1, +1, -1,

				-1, -1, -1,     +1, -1, -1,
				+1, -1, -1,     +1, +1, -1,
				+1, +1, -1,     -1, +1, -1,
				-1, +1, -1,     -1, -1, -1,
			]);

			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

			const material = new THREE.LineBasicMaterial();

			this.frustum = new THREE.LineSegments(geometry, material);
			this.add(this.frustum);
		}

		this.update();
	}

	update(): void {
		this.light.updateMatrix();
		this.light.updateMatrixWorld();

		const position = this.light.position;
		const target = new THREE.Vector3().addVectors(
			this.light.position,
			this.light.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1)
		);

		const quat = new THREE.Quaternion().setFromRotationMatrix(
			new THREE.Matrix4().lookAt(position, target, new THREE.Vector3(0, 0, 1))
		);

		this.setRotationFromQuaternion(quat);
		this.position.copy(position);

		const coneLength = (this.light.distance > 0) ? this.light.distance : 1000;
		const coneWidth = coneLength * Math.tan(this.light.angle * 0.5);

		this.frustum.scale.set(coneWidth, coneWidth, coneLength);
	}
}
