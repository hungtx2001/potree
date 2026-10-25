import * as THREE from 'three';

export class PointCloudSM {
	potreeRenderer: any;
	threeRenderer: THREE.WebGLRenderer;
	target: THREE.WebGLRenderTarget;
	light?: any;
	camera?: THREE.PerspectiveCamera;

	constructor(potreeRenderer: any) {
		this.potreeRenderer = potreeRenderer;
		this.threeRenderer = this.potreeRenderer.threeRenderer;

		this.target = new THREE.WebGLRenderTarget(2 * 1024, 2 * 1024, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.target.depthTexture = new THREE.DepthTexture(2 * 1024, 2 * 1024);
		this.target.depthTexture.type = THREE.UnsignedIntType;

		this.threeRenderer.setClearColor(0xff0000, 1);

		const oldTarget = this.threeRenderer.getRenderTarget();
		this.threeRenderer.setRenderTarget(this.target);
		this.threeRenderer.clear(true, true, true);
		this.threeRenderer.setRenderTarget(oldTarget);
	}

	setLight(light: any): void {
		this.light = light;

		const fov = (180 * light.angle) / Math.PI;
		const aspect = light.shadow.mapSize.width / light.shadow.mapSize.height;
		const near = 0.1;
		const far = light.distance === 0 ? 10000 : light.distance;
		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.camera.up.set(0, 0, 1);
		this.camera.position.copy(light.position);

		const target = new THREE.Vector3().subVectors(light.position, light.getWorldDirection(new THREE.Vector3()));
		this.camera.lookAt(target);

		this.camera.updateProjectionMatrix();
		this.camera.updateMatrix();
		this.camera.updateMatrixWorld();
		this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
	}

	setSize(width: number, height: number): void {
		if (this.target.width !== width || this.target.height !== height) {
			this.target.dispose();
		}
		this.target.setSize(width, height);
	}

	render(scene: any, _camera?: any): void {
		if (!this.camera) return;

		this.threeRenderer.setClearColor(0x000000, 1);

		const oldTarget = this.threeRenderer.getRenderTarget();

		this.threeRenderer.setRenderTarget(this.target);
		this.threeRenderer.clear(true, true, true);

		this.potreeRenderer.render(scene, this.camera, this.target, {});

		this.threeRenderer.setRenderTarget(oldTarget);
	}
}
