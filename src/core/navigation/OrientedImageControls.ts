import * as THREE from 'three';
import { EventDispatcher } from '../EventDispatcher.js';

export class OrientedImageControls extends EventDispatcher {
	viewer: any;
	renderer: THREE.WebGLRenderer;
	originalCam: THREE.PerspectiveCamera;
	shearCam: THREE.PerspectiveCamera;
	image: any;
	fadeFactor: number;
	fovDelta: number;
	fovMin: number;
	fovMax: number;
	shear: [number, number];
	scene: any;
	sceneControls: THREE.Scene;
	originalFOV?: number;
	originalControls?: any;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.originalCam = viewer.scene.getActiveCamera();
		this.shearCam = viewer.scene.getActiveCamera().clone();
		this.shearCam.rotation.copy(this.originalCam.rotation);
		this.shearCam.updateProjectionMatrix();

		this.image = null;
		this.fadeFactor = 20;
		this.fovDelta = 0;
		this.fovMin = 0.1;
		this.fovMax = 120;
		this.shear = [0, 0];

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		const scroll = (e: any) => {
			this.fovDelta += -e.delta * 1.0;
		};

		this.addEventListener('mousewheel', scroll);
	}

	shearUp(amount: number = 0.1): void {
		const fovY = this.viewer.getFOV();
		const top = Math.tan(THREE.MathUtils.degToRad(fovY / 2));
		this.shear[1] += amount * top;
		this.dispatchEvent({ type: 'shear_changed', shear: this.shear });
	}

	shearDown(amount: number = 0.1): void {
		const fovY = this.viewer.getFOV();
		const top = Math.tan(THREE.MathUtils.degToRad(fovY / 2));
		this.shear[1] -= amount * top;
		this.dispatchEvent({ type: 'shear_changed', shear: this.shear });
	}

	shearRight(amount: number = 0.1): void {
		const fovY = this.viewer.getFOV();
		const top = Math.tan(THREE.MathUtils.degToRad(fovY / 2));
		this.shear[0] += amount * top;
		this.dispatchEvent({ type: 'shear_changed', shear: this.shear });
	}

	shearLeft(amount: number = 0.1): void {
		const fovY = this.viewer.getFOV();
		const top = Math.tan(THREE.MathUtils.degToRad(fovY / 2));
		this.shear[0] -= amount * top;
		this.dispatchEvent({ type: 'shear_changed', shear: this.shear });
	}

	hasSomethingCaptured(): boolean {
		return this.image !== null;
	}

	capture(image: any): void {
		if (this.hasSomethingCaptured()) {
			return;
		}

		this.image = image;
		this.originalFOV = this.viewer.getFOV();
		this.originalControls = this.viewer.getControls();

		this.viewer.setControls(this);
		this.viewer.scene.overrideCamera = this.shearCam;

		this.shear = [0, 0];
		this.dispatchEvent({ type: 'captured', image: this.image });
	}

	release(): void {
		if (!this.hasSomethingCaptured()) {
			return;
		}

		const prevImage = this.image;
		this.image = null;

		this.viewer.scene.overrideCamera = null;
		if (this.originalFOV !== undefined) {
			this.viewer.setFOV(this.originalFOV);
		}
		if (this.originalControls) {
			this.viewer.setControls(this.originalControls);
		}

		this.dispatchEvent({ type: 'released', image: prevImage });
	}

	setScene(scene: any): void {
		this.scene = scene;
	}

	update(_delta?: number): void {
		const progression = 1;
		const attenuation = 0;

		const oldFov = this.viewer.getFOV();
		const fovProgression = progression * this.fovDelta;
		let newFov = oldFov * (1 + fovProgression / 10);

		newFov = Math.max(this.fovMin, newFov);
		newFov = Math.min(this.fovMax, newFov);

		const diff = newFov / oldFov;

		const mouse = this.viewer.inputHandler?.mouse || new THREE.Vector2();
		const canvasSize = this.viewer.renderer.getSize(new THREE.Vector2());
		const uv = [
			mouse.x / canvasSize.x,
			(canvasSize.y - mouse.y) / canvasSize.y
		];

		const fovY = newFov;
		const aspect = canvasSize.x / canvasSize.y;
		const top = Math.tan(THREE.MathUtils.degToRad(fovY / 2));
		const height = 2 * top;
		const width = aspect * height;

		const shearRangeX = [
			this.shear[0] - 0.5 * width,
			this.shear[0] + 0.5 * width,
		];

		const shearRangeY = [
			this.shear[1] - 0.5 * height,
			this.shear[1] + 0.5 * height,
		];

		const shx = (1 - uv[0]) * shearRangeX[0] + uv[0] * shearRangeX[1];
		const shy = (1 - uv[1]) * shearRangeY[0] + uv[1] * shearRangeY[1];

		const shu = 1 - diff;

		const newShear: [number, number] = [
			(1 - shu) * this.shear[0] + shu * shx,
			(1 - shu) * this.shear[1] + shu * shy,
		];

		this.shear = newShear;
		this.viewer.setFOV(newFov);

		const { originalCam, shearCam } = this;

		originalCam.fov = newFov;
		originalCam.updateMatrixWorld();
		originalCam.updateProjectionMatrix();
		shearCam.copy(originalCam);
		shearCam.rotation.copy(originalCam.rotation);

		shearCam.updateMatrixWorld();
		shearCam.projectionMatrix.copy(originalCam.projectionMatrix);

		const [sx, sy] = this.shear;
		const mShear = new THREE.Matrix4().set(
			1, 0, sx, 0,
			0, 1, sy, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		);

		const proj = shearCam.projectionMatrix;
		proj.multiply(mShear);
		shearCam.projectionMatrixInverse.copy(proj).invert();

		this.fovDelta *= attenuation;
	}
}
